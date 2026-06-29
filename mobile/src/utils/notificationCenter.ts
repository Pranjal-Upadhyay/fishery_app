import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '../database';
import Pond from '../database/models/Pond';
import WaterQualityLog from '../database/models/WaterQualityLog';
import { evaluatePondHealth } from './pondAdvisory';
import { getCurrentMilestone, getCultureProfile, getWaterQualityTargets, getFeedingGuide, getSpeciesProfile } from './pondLifecycle';
import { fetchSpeciesLookup } from './speciesLookup';
import { authService } from '../services/authService';
import { farmerNotificationsService } from '../services/apiService';

const NOTIFICATION_READS_KEY = '@fishing_god_notification_reads';

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationType = 'harvest' | 'water_quality' | 'setup' | 'feed' | 'disease' | 'market' | 'subsidy' | 'milestone' | 'temperature';

export interface FarmNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: number;
  pondId?: string;
  pondName?: string;
  isRead: boolean;
}

type NotificationReadMap = Record<string, boolean>;

async function loadReadMap(): Promise<NotificationReadMap> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_READS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotificationReadMap;
  } catch { return {}; }
}

async function saveReadMap(readMap: NotificationReadMap) {
  await AsyncStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(readMap));
}

type PondLike = {
  id: string; name: string; speciesId?: string | null;
  stockingDate?: number | null; status?: string | null;
  systemType?: string | null;
  createdAt?: number | null; updatedAt?: number | null;
};

type WaterLogLike = {
  id: string; pondId: string; timestamp: number;
  temperature?: number | null; dissolvedOxygen?: number | null;
  ph?: number | null; ammonia?: number | null;
};

function push(items: FarmNotification[], item: Omit<FarmNotification, 'isRead'>, readMap: NotificationReadMap) {
  items.push({ ...item, isRead: Boolean(readMap[item.id]) });
}

function buildNotifications(params: {
  ponds: PondLike[];
  logs: WaterLogLike[];
  speciesLookup: Record<string, { label: string; scientificName: string }>;
  readMap: NotificationReadMap;
}): FarmNotification[] {
  const { ponds, logs, speciesLookup, readMap } = params;
  const items: FarmNotification[] = [];
  const now = Date.now();
  const DAY = 86400000;

  // Latest log per pond
  const latestLogByPond = new Map<string, WaterLogLike>();
  for (const log of logs) {
    const cur = latestLogByPond.get(log.pondId);
    if (!cur || cur.timestamp < log.timestamp) latestLogByPond.set(log.pondId, log);
  }

  for (const pond of ponds) {
    const status = String(pond.status || '').toLowerCase();
    const species = pond.speciesId ? speciesLookup[pond.speciesId] : null;
    const sciName = species?.scientificName ?? null;
    const profile = getSpeciesProfile(sciName);
    const wqTargets = getWaterQualityTargets(sciName);
    const feedGuide = getFeedingGuide(sciName);

    // ── 1. Setup incomplete ──────────────────────────────────────────────────
    if (status === 'active' && (!pond.speciesId || !pond.stockingDate)) {
      push(items, {
        id: `setup-${pond.id}`,
        type: 'setup', severity: 'warning',
        title: `Complete setup for ${pond.name}`,
        message: 'Add species and stocking date to unlock harvest tracking, feeding schedules, and daily alerts.',
        timestamp: pond.updatedAt || pond.createdAt || 0,
        pondId: pond.id, pondName: pond.name,
      }, readMap);
      continue; // No further alerts until setup is complete
    }

    if (status !== 'active' || !pond.stockingDate) continue;

    // ── 2. Growth stage milestone ────────────────────────────────────────────
    const milestone = getCurrentMilestone({
      stockingDate: pond.stockingDate,
      speciesScientificName: sciName,
      system: pond.systemType,
    });

    // Harvest ready
    if (milestone.isReady) {
      push(items, {
        id: `harvest-ready-${pond.id}-${pond.stockingDate}`,
        type: 'harvest', severity: 'info',
        title: `🎣 ${pond.name} is ready to harvest!`,
        message: `${species?.label || 'Your fish'} has completed the ${getCultureProfile(sciName, pond.systemType).days}-day culture period. Harvest now for best price.`,
        timestamp: milestone.expectedHarvestAt || pond.stockingDate,
        pondId: pond.id, pondName: pond.name,
      }, readMap);
    } else if (milestone.daysRemaining <= 14 && milestone.daysRemaining > 0) {
      push(items, {
        id: `harvest-soon-${pond.id}-${pond.stockingDate}`,
        type: 'harvest', severity: 'warning',
        title: `⏰ ${pond.name} harvest in ${milestone.daysRemaining} days`,
        message: `${species?.label || 'Your fish'} is approaching harvest. Prepare nets, buyers, and transport. ${getCultureProfile(sciName, pond.systemType).note}`,
        timestamp: milestone.expectedHarvestAt || pond.stockingDate,
        pondId: pond.id, pondName: pond.name,
      }, readMap);
    }

    // Current growth stage action
    const stageId = `milestone-${pond.id}-${milestone.stage.replace(/\s/g, '-')}`;
    push(items, {
      id: stageId,
      type: 'milestone', severity: 'info',
      title: `📊 ${pond.name}: ${milestone.stage}`,
      message: `Day ${milestone.daysElapsed} of ${getCultureProfile(sciName, pond.systemType).days}. ${milestone.action}`,
      timestamp: now - DAY,
      pondId: pond.id, pondName: pond.name,
    }, readMap);

    // ── 3. Species-specific feeding reminder ─────────────────────────────────
    if (feedGuide) {
      const feedId = `feed-${pond.id}-${new Date().toDateString()}`;
      const feedTimes = feedGuide.feedingTimes.join(', ');
      const bwPct = milestone.daysElapsed < 30 ? feedGuide.bwPercentEarly : feedGuide.bwPercentGrowOut;
      push(items, {
        id: feedId,
        type: 'feed', severity: 'info',
        title: `🍽️ Feed ${pond.name} today`,
        message: `${species?.label || 'Fish'} (Day ${milestone.daysElapsed}): Feed ${feedGuide.feedType} at ${bwPct} body weight, ${feedGuide.frequencyPerDay}x daily. Best times: ${feedTimes}.`,
        timestamp: now - (DAY * 0.5),
        pondId: pond.id, pondName: pond.name,
      }, readMap);

      // Feed tip of the day (rotates by day of year)
      if (feedGuide.tips.length > 0) {
        const tipIndex = Math.floor(now / (DAY * 3)) % feedGuide.tips.length;
        const tipId = `feed-tip-${pond.id}-${tipIndex}`;
        push(items, {
          id: tipId,
          type: 'feed', severity: 'info',
          title: `💡 Feeding tip for ${species?.label || 'your fish'}`,
          message: feedGuide.tips[tipIndex],
          timestamp: now - (DAY * 1.5),
          pondId: pond.id, pondName: pond.name,
        }, readMap);
      }
    }

    // ── 4. Water quality check ───────────────────────────────────────────────
    const lastLog = latestLogByPond.get(pond.id);
    if (lastLog) {
      const advisory = evaluatePondHealth({
        temperature: lastLog.temperature,
        dissolved_oxygen: lastLog.dissolvedOxygen,
        ph: lastLog.ph,
        ammonia: lastLog.ammonia,
      });

      if (advisory.level !== 'good') {
        push(items, {
          id: `water-quality-${lastLog.id}`,
          type: 'water_quality',
          severity: advisory.level === 'critical' ? 'critical' : 'warning',
          title: `${pond.name}: ${advisory.title.replace(/^[^\w]+/u, '').trim()}`,
          message: advisory.message,
          timestamp: lastLog.timestamp,
          pondId: pond.id, pondName: pond.name,
        }, readMap);
      }

      // Species-specific temperature warning
      if (lastLog.temperature != null) {
        const temp = lastLog.temperature;
        if (wqTargets.coldWarningBelow && temp < wqTargets.coldWarningBelow) {
          const coldId = `cold-warning-${pond.id}-${lastLog.id}`;
          push(items, {
            id: coldId,
            type: 'temperature', severity: 'warning',
            title: `🌡️ Cold stress risk for ${species?.label || 'your fish'}`,
            message: `Water temp is ${temp}°C — below the safe minimum of ${wqTargets.coldWarningBelow}°C for ${species?.label || 'this species'}. Reduce feeding by 50%. ${sciName === 'Pangasianodon hypophthalmus' ? 'Harvest Pangasius before October!' : 'Avoid stocking during cold spell.'}`,
            timestamp: lastLog.timestamp,
            pondId: pond.id, pondName: pond.name,
          }, readMap);
        }
        if (wqTargets.heatWarningAbove && temp > wqTargets.heatWarningAbove) {
          const heatId = `heat-warning-${pond.id}-${lastLog.id}`;
          push(items, {
            id: heatId,
            type: 'temperature', severity: 'warning',
            title: `🌡️ Heat stress risk for ${species?.label || 'your fish'}`,
            message: `Water temp is ${temp}°C — above the safe maximum of ${wqTargets.heatWarningAbove}°C for ${species?.label || 'this species'}. Run aerators 24/7. Reduce feed by 30%.`,
            timestamp: lastLog.timestamp,
            pondId: pond.id, pondName: pond.name,
          }, readMap);
        }
      }

      // Overdue water quality check
      const daysSinceLog = Math.floor((now - lastLog.timestamp) / DAY);
      if (daysSinceLog >= 5) {
        push(items, {
          id: `wq-overdue-${pond.id}`,
          type: 'water_quality', severity: 'warning',
          title: `📋 Water check overdue for ${pond.name}`,
          message: `Last logged ${daysSinceLog} days ago. ${species?.label ? `${species.label} needs` : 'Your fish need'} DO > ${wqTargets.doMin} mg/L and pH ${wqTargets.phMin}–${wqTargets.phMax}. Log today to stay on track.`,
          timestamp: now - DAY,
          pondId: pond.id, pondName: pond.name,
        }, readMap);
      }
    } else {
      // No logs at all
      push(items, {
        id: `wq-missing-${pond.id}`,
        type: 'water_quality', severity: 'warning',
        title: `📋 Start logging ${pond.name}`,
        message: `No water quality data yet. ${species?.label ? `${species.label} needs` : 'Your fish need'} DO > ${wqTargets.doMin} mg/L, pH ${wqTargets.phMin}–${wqTargets.phMax}, temp ${wqTargets.tempOptMin}–${wqTargets.tempOptMax}°C. Log your first reading today.`,
        timestamp: pond.updatedAt || pond.createdAt || now,
        pondId: pond.id, pondName: pond.name,
      }, readMap);
    }

    // ── 5. Weekly water quality target reminder ──────────────────────────────
    const weeklyId = `wq-targets-${pond.id}-week${Math.floor(now / (DAY * 7))}`;
    push(items, {
      id: weeklyId,
      type: 'water_quality', severity: 'info',
      title: `📊 Weekly targets for ${species?.label || pond.name}`,
      message: `Optimal: Temp ${wqTargets.tempOptMin}–${wqTargets.tempOptMax}°C | DO > ${wqTargets.doOpt} mg/L | pH ${wqTargets.phMin}–${wqTargets.phMax} | Ammonia < ${wqTargets.ammoniaMax} mg/L`,
      timestamp: now - (DAY * 2),
      pondId: pond.id, pondName: pond.name,
    }, readMap);
  }

  // ── Static regional alerts (will be replaced by real API data later) ────────
  const diseaseId = 'regional-disease-alert';
  push(items, {
    id: diseaseId,
    type: 'disease', severity: 'critical',
    title: 'Regional Disease Alert: ARGULUS',
    message: 'Reports of ARGULUS (fish lice) in your district. Watch for fish rubbing against surfaces. Apply KMnO4 (2–4 mg/L) as preventive measure.',
    timestamp: now - (DAY * 2),
  }, readMap);

  const subsidyId = 'pmmsy-subsidy-reminder';
  push(items, {
    id: subsidyId,
    type: 'subsidy', severity: 'info',
    title: 'PMMSY Subsidy Available',
    message: 'Pradhan Mantri Matsya Sampada Yojana subsidizes 40–60% of aquaculture setup costs. Apply through your district fisheries office.',
    timestamp: now - (DAY * 4),
  }, readMap);

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getNotificationFeed(): Promise<FarmNotification[]> {
  const [ponds, logs, speciesLookup, readMap, user] = await Promise.all([
    database.collections.get<Pond>('ponds').query().fetch(),
    database.collections.get<WaterQualityLog>('water_quality_logs').query().fetch(),
    fetchSpeciesLookup(),
    loadReadMap(),
    authService.getCurrentUser().catch(() => null),
  ]);

  const localItems = buildNotifications({
    ponds: ponds.map(p => ({
      id: p.id, name: p.name, speciesId: p.speciesId,
      stockingDate: p.stockingDate, status: p.status,
      systemType: (p as any).systemType ?? null,
      createdAt: p.createdAt?.getTime?.() ?? null,
      updatedAt: p.updatedAt?.getTime?.() ?? null,
    })),
    logs: logs.map(l => ({
      id: l.id, pondId: l.pondId, timestamp: l.timestamp,
      temperature: l.temperature, dissolvedOxygen: l.dissolvedOxygen,
      ph: l.ph, ammonia: l.ammonia,
    })),
    speciesLookup,
    readMap,
  });

  // Fetch server-dispatched alerts from backend
  if (user?.id) {
    try {
      const serverRes = await farmerNotificationsService.getForFarmer(user.id);
      if (serverRes?.success && Array.isArray(serverRes.data)) {
        serverRes.data.forEach(item => {
          const isRead = item.is_read || Boolean(readMap[item.id]);
          let severity: NotificationSeverity = 'warning';
          if (item.type?.includes('critical') || item.type?.includes('outbreak') || item.title?.includes('Urgent') || item.title?.includes('Alert')) {
            severity = 'critical';
          } else if (item.type?.includes('info') || item.type?.includes('advisory')) {
            severity = 'info';
          }

          let notifType: NotificationType = 'disease';
          if (item.type?.includes('water')) notifType = 'water_quality';
          if (item.type?.includes('market')) notifType = 'market';

          localItems.push({
            id: item.id,
            type: notifType,
            severity,
            title: item.title,
            message: item.message,
            timestamp: new Date(item.created_at).getTime(),
            isRead,
          });
        });
      }
    } catch (err) {
      // Graceful fallback if offline or server unreachable
    }
  }

  return localItems.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const feed = await getNotificationFeed();
  return feed.filter(n => !n.isRead).length;
}

export async function markNotificationRead(notificationId: string) {
  const readMap = await loadReadMap();
  readMap[notificationId] = true;
  await saveReadMap(readMap);
}

export async function markAllNotificationsRead(notificationIds: string[]) {
  const readMap = await loadReadMap();
  for (const id of notificationIds) readMap[id] = true;
  await saveReadMap(readMap);
}
