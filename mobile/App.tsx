import 'react-native-get-random-values';
/**
 * Fishing God Mobile App - Entry Point
 * React Native with Expo and WatermelonDB
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import './src/i18n';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import database from './src/database';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { AuthProvider, useAuth } from './src/AuthContext';

// Farmer screens
import HomeScreen from './src/screens/HomeScreen';
import SpeciesScreen from './src/screens/SpeciesScreen';
import SpeciesDetailScreen from './src/screens/SpeciesDetailScreen';
import EconomicsScreen from './src/screens/EconomicsScreen';
import EconomicsResultScreen from './src/screens/EconomicsResultScreen';
import PolicyGuidanceScreen from './src/screens/PolicyGuidanceScreen';
import LearningCenterScreen from './src/screens/LearningCenterScreen';
import SystemTypesScreen from './src/screens/SystemTypesScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WaterQualityScreen from './src/screens/WaterQualityScreen';
import MarketPricesScreen from './src/screens/MarketPricesScreen';
import EquipmentCatalogScreen from './src/screens/EquipmentCatalogScreen';
import FeedCatalogScreen from './src/screens/FeedCatalogScreen';
import PersonalInfoScreen from './src/screens/PersonalInfoScreen';
import YojanaApplicationsScreen from './src/screens/YojanaApplicationsScreen';
import PondsListScreen from './src/screens/PondsListScreen';
import AddEditPondScreen from './src/screens/AddEditPondScreen';
import CropCycleScreen from './src/screens/CropCycleScreen';
import FarmAssetsScreen from './src/screens/FarmAssetsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AuthScreen from './src/screens/AuthScreen';
import DiseaseListScreen from './src/screens/DiseaseListScreen';
import DiseaseDetailScreen from './src/screens/DiseaseDetailScreen';
import DoctorNetworkScreen from './src/screens/DoctorNetworkScreen';
import HatcheryDashboardScreen from './src/screens/HatcheryDashboardScreen';
import AddHatcheryScreen from './src/screens/AddHatcheryScreen';
import AddEditBatchScreen from './src/screens/AddEditBatchScreen';
import BatchDetailScreen from './src/screens/BatchDetailScreen';
import StageLogScreen from './src/screens/StageLogScreen';
import FingerlingSalesScreen from './src/screens/FingerlingSalesScreen';
import HatcheryMarketplaceScreen from './src/screens/HatcheryMarketplaceScreen';
import StockFingerlingsFromMarketScreen from './src/screens/StockFingerlingsFromMarketScreen';
import HatcheryROIScreen from './src/screens/HatcheryROIScreen';
import HatcheryLearningScreen from './src/screens/LearningCenterScreen';
import MarketListingsScreen from './src/screens/MarketListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import ManageListingsScreen from './src/screens/ManageListingsScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import IncomingOrdersScreen from './src/screens/IncomingOrdersScreen';

// Doctor screens
import DoctorDashboardScreen from './src/screens/DoctorDashboardScreen';
import DoctorAppointmentsScreen from './src/screens/DoctorAppointmentsScreen';
import DoctorAlertsScreen from './src/screens/DoctorAlertsScreen';
import DoctorReportsScreen from './src/screens/DoctorReportsScreen';
import DoctorProfileScreen from './src/screens/DoctorProfileScreen';
import DoctorAppointmentDetailScreen from './src/screens/DoctorAppointmentDetailScreen';

export type RootStackParamList = {
  Main: undefined;
  SpeciesDetail: { speciesId: string };
  EconomicsResult: { simulationData: any };
  PolicyGuidance: { knowledgeInsights?: any; stateCode?: string; farmerCategory?: string };
  LearningCenter: { knowledgeInsights?: any; stateCode?: string; farmerCategory?: string } | undefined;
  SystemTypes: undefined;
  WaterQuality: { pondId?: string; initialTab?: 'log' | 'history' } | undefined;
  MarketPrices: undefined;
  EquipmentCatalog: undefined;
  FeedCatalog: undefined;
  PersonalInfo: undefined;
  YojanaApplications: undefined;
  PondsList: undefined;
  AddEditPond: { pondId?: string };
  Notifications: undefined;
  DiseaseList: undefined;
  DiseaseDetail: { disease: any };
  Maps: undefined;
  DoctorNetwork: undefined;
  HatcheryDashboard: undefined;
  AddHatchery: undefined;
  AddEditBatch: { hatcheryId: string };
  BatchDetail: { batchId: string };
  StageLog: { batchId: string; currentStage: string };
  FingerlingSales: { batchId: string };
  HatcheryMarketplace: undefined;
  StockFingerlings: { listing: any };
  MarketListings: undefined;
  ListingDetail: { listingId: string };
  CropCycle: { pondId: string; pondName?: string };
  FarmAssets: { pondId?: string; pondName?: string } | undefined;
  MyOrders: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Species: undefined;
  Economics: undefined;
  Diseases: undefined;
  Profile: undefined;
};

export type DoctorRootStackParamList = {
  DoctorMain: undefined;
  DoctorAppointmentDetail: { appointmentId: string };
};

export type DoctorTabParamList = {
  DoctorDashboard: undefined;
  DoctorVisits: undefined;
  DoctorAlerts: undefined;
  DoctorReports: undefined;
  DoctorProfile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const DoctorTab = createBottomTabNavigator<DoctorTabParamList>();
const DoctorStack = createStackNavigator<DoctorRootStackParamList>();

export type HatcheryRootStackParamList = {
  HatcheryMain: undefined;
  AddHatchery: undefined;
  AddEditBatch: { hatcheryId: string };
  BatchDetail: { batchId: string };
  StageLog: { batchId: string; currentStage: string };
  FingerlingSales: { batchId: string };
  PersonalInfo: undefined;
  Notifications: undefined;
  SpeciesDetail: { speciesId: string };
  ManageListings: undefined;
  CreateListing: undefined;
  IncomingOrders: { listingId?: string };
  HatcheryLearning: undefined;
  ListingDetail: { listingId: string };
};

export type HatcheryTabParamList = {
  HatcheryDashboard: undefined;
  HatcherySpecies: undefined;
  HatcheryEquipments: undefined;
  HatcheryROI: undefined;
  HatcheryProfile: undefined;
};

const HatcheryTab = createBottomTabNavigator<HatcheryTabParamList>();
const HatcheryStack = createStackNavigator<HatcheryRootStackParamList>();

function MainTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Species':
              iconName = focused ? 'fish' : 'fish-outline';
              break;
            case 'Economics':
              iconName = focused ? 'calculator' : 'calculator-outline';
              break;
            case 'Diseases':
              iconName = focused ? 'bug' : 'bug-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          elevation: 0,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
          paddingHorizontal: 2,
        },
        headerShown: false,
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('navigation.home') || 'Home' }}
      />
      <Tab.Screen
        name="Species"
        component={SpeciesScreen}
        options={{ title: t('navigation.species') || 'Species' }}
      />
      <Tab.Screen
        name="Economics"
        component={EconomicsScreen}
        options={{ title: t('navigation.economics') || 'Economics' }}
      />
      <Tab.Screen
        name="Diseases"
        component={DiseaseListScreen}
        options={{ title: t('disease.title') || 'Diseases' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('navigation.profile') || 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function DoctorTabs() {
  const { theme } = useTheme();

  return (
    <DoctorTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconByRoute: Record<keyof DoctorTabParamList, keyof typeof Ionicons.glyphMap> = {
            DoctorDashboard: focused ? 'speedometer' : 'speedometer-outline',
            DoctorVisits: focused ? 'medical' : 'medical-outline',
            DoctorAlerts: focused ? 'notifications' : 'notifications-outline',
            DoctorReports: focused ? 'bar-chart' : 'bar-chart-outline',
            DoctorProfile: focused ? 'person-circle' : 'person-circle-outline',
          };

          return <Ionicons name={iconByRoute[route.name as keyof DoctorTabParamList]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 2,
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          elevation: 0,
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
        },
        headerShown: false,
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }} />
        ),
      })}
    >
      <DoctorTab.Screen name="DoctorDashboard" component={DoctorDashboardScreen} options={{ title: 'Overview' }} />
      <DoctorTab.Screen name="DoctorVisits" component={DoctorAppointmentsScreen} options={{ title: 'Visits' }} />
      <DoctorTab.Screen name="DoctorAlerts" component={DoctorAlertsScreen} options={{ title: 'Alerts' }} />
      <DoctorTab.Screen name="DoctorReports" component={DoctorReportsScreen} options={{ title: 'Reports' }} />
      <DoctorTab.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ title: 'Profile' }} />
    </DoctorTab.Navigator>
  );
}

function FarmerNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="SpeciesDetail" component={SpeciesDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EconomicsResult" component={EconomicsResultScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PolicyGuidance" component={PolicyGuidanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LearningCenter" component={LearningCenterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WaterQuality" component={WaterQualityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MarketPrices" component={MarketPricesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EquipmentCatalog" component={EquipmentCatalogScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FeedCatalog" component={FeedCatalogScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="YojanaApplications" component={YojanaApplicationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PondsList" component={PondsListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddEditPond" component={AddEditPondScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="CropCycle" component={CropCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FarmAssets" component={FarmAssetsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DiseaseList" component={DiseaseListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DiseaseDetail" component={DiseaseDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Maps" component={MapScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DoctorNetwork" component={DoctorNetworkScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HatcheryDashboard" component={HatcheryDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddHatchery" component={AddHatcheryScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="AddEditBatch" component={AddEditBatchScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StageLog" component={StageLogScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="FingerlingSales" component={FingerlingSalesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HatcheryMarketplace" component={HatcheryMarketplaceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StockFingerlings" component={StockFingerlingsFromMarketScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SystemTypes" component={SystemTypesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MarketListings" component={MarketListingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function DoctorNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <DoctorStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <DoctorStack.Screen name="DoctorMain" component={DoctorTabs} options={{ headerShown: false }} />
        <DoctorStack.Screen name="DoctorAppointmentDetail" component={DoctorAppointmentDetailScreen} options={{ headerShown: false }} />
      </DoctorStack.Navigator>
    </NavigationContainer>
  );
}

function HatcheryTabs() {
  const { theme } = useTheme();

  return (
    <HatcheryTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HatcheryDashboard':
              iconName = focused ? 'speedometer' : 'speedometer-outline';
              break;
            case 'HatcherySpecies':
              iconName = focused ? 'fish' : 'fish-outline';
              break;
            case 'HatcheryEquipments':
              iconName = focused ? 'construct' : 'construct-outline';
              break;
            case 'HatcheryROI':
              iconName = focused ? 'cash' : 'cash-outline';
              break;
            case 'HatcheryProfile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          elevation: 0,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
          paddingHorizontal: 2,
        },
        headerShown: false,
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }} />
        ),
      })}
    >
      <HatcheryTab.Screen
        name="HatcheryDashboard"
        component={HatcheryDashboardScreen}
        options={{ title: 'Overview' }}
      />
      <HatcheryTab.Screen
        name="HatcherySpecies"
        component={SpeciesScreen}
        options={{ title: 'Species' }}
      />
      <HatcheryTab.Screen
        name="HatcheryEquipments"
        component={EquipmentCatalogScreen}
        options={{ title: 'Equipments' }}
      />
      <HatcheryTab.Screen
        name="HatcheryROI"
        component={HatcheryROIScreen}
        options={{ title: 'Hatchery ROI' }}
      />
      <HatcheryTab.Screen
        name="HatcheryProfile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </HatcheryTab.Navigator>
  );
}

function HatcheryNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <HatcheryStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <HatcheryStack.Screen name="HatcheryMain" component={HatcheryTabs} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="AddHatchery" component={AddHatcheryScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <HatcheryStack.Screen name="AddEditBatch" component={AddEditBatchScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <HatcheryStack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="StageLog" component={StageLogScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <HatcheryStack.Screen name="FingerlingSales" component={FingerlingSalesScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="SpeciesDetail" component={SpeciesDetailScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="ManageListings" component={ManageListingsScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="IncomingOrders" component={IncomingOrdersScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="HatcheryLearning" component={HatcheryLearningScreen} options={{ headerShown: false }} />
        <HatcheryStack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      </HatcheryStack.Navigator>
    </NavigationContainer>
  );
}

function MainApp() {
  const { isAuthenticated, authRole, establishSession } = useAuth();
  const { mode } = useTheme();

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={establishSession} />;
  }

  const renderNavigator = () => {
    if (authRole === 'doctor') return <DoctorNavigator />;
    if (authRole === 'hatchery') return <HatcheryNavigator />;
    return <FarmerNavigator />;
  };

  return (
    <>
      {renderNavigator()}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider database={database}>
        <AuthProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <MainApp />
            </SafeAreaProvider>
          </ThemeProvider>
        </AuthProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}

export default App;
