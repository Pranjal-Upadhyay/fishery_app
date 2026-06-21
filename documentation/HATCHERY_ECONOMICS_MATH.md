# MatsyaMitra Hatchery Economics: How the Business and Mathematics Work

This document explains the business model, financial formulas, and regional data benchmarks used in the **Hatchery ROI (Return on Investment) Simulator**. It is written to be easily understood by farmers, operators, and coordinators alike—without requiring programming knowledge.

---

## 1. How the Hatchery Business Works

A hatchery is a specialized facility where parent fish are bred to produce baby fish. Unlike a grow-out farm (where small fish are grown to large table-size fish for eating), a hatchery’s end products are **seeds** (spawn, fry, or fingerlings) sold to grow-out farmers.

### The Hatchery Lifecycle Stages
To understand the business, it helps to understand how a fish seed grows:

1. **Broodstock**: Mature male and female parent fish kept in optimal conditions (fed high-protein food) so they are healthy and ready to reproduce.
2. **Induced Spawning**: The process of injecting male and female parent fish with a hormone (like Ovaprim) to trigger the release of eggs and milt (sperm) in a controlled spawning pool.
3. **Hatching**: Fertilized eggs are transferred to circular incubation pools or jars where they hatch into tiny larvae (**hatchlings**) within 15–27 hours.
4. **Yolk-Sac Absorption (Spawn)**: For the first 3–4 days, the hatchlings do not eat external food; they survive on their own yolk sac. Once the yolk sac is absorbed (size: 5–6 mm), they are called **Spawn**. Spawn is the primary product bought and sold at early stages.
5. **Nursery Phase (Fry)**: Spawn are stocked in heavily prepared nursery ponds for 15–25 days, growing to 25–30 mm. At this stage, they are called **Fry**.
6. **Rearing Phase (Fingerling)**: Fry are moved to rearing ponds for 60–90 days, growing to 100–150 mm (weighing 8–15 grams). At this stage, they are called **Fingerlings**. Fingerlings are the ideal size for grow-out farmers to stock because they have a much higher survival rate.

---

## 2. Key Terms Explained

Before looking at the mathematics, here are simple definitions of the terms used in the simulator:

* **Spawning Cycle**: One complete run of breeding parent fish, hatching the eggs, and rearing them to spawn. Hatcheries typically run multiple cycles per year (typically 4 to 8 cycles during the breeding season from April to September).
* **Survival Rate**: The percentage of baby fish that survive from the initial spawn stage to the final fingerling stage. For example, if you buy 100 spawns and 30 grow into fingerlings, your survival rate is 30%.
* **CAPEX (Capital Expenditure / Initial Setup Cost)**: The one-time money needed to buy land, construct ponds, build breeding/hatching pools, install pumps, and buy machinery to start the hatchery.
* **OPEX (Operational Expenditure / Running Costs)**: The recurring money spent to run the hatchery every year. This includes buying parent fish/spawn, feeding them, buying medicine, electricity/water bills, and paying labor wages.
* **Revenue (Gross Sales)**: The total money the hatchery makes by selling fingerlings to grow-out farmers.
* **Net Profit**: The money left over from sales after paying all running costs (OPEX).
* **Net Margin (%)**: A percentage showing how profitable the business is relative to its sales. A Net Margin of 35% means that for every ₹100 of fingerlings sold, ₹35 is kept as profit.
* **Payback Period**: The number of years it will take for your accumulated net profits to pay back your initial setup cost (CAPEX).

---

## 2.1 Default Baseline Values & Assumptions
The simulator uses specific default values that reflect the standard operational scale and biological benchmarks in Bihar. Here is why those values are used:

* **Spawn Capacity per Cycle (Default: 5 Million spawns)**:
  * *Why 5 Million?* In Bihar's government subsidy schemes (like the Mukhyamantri Talab Matsyiki Vikas Yojana), the standard carp hatchery unit is designed and financed for a breeding capacity of 5 million spawn per batch. This matches the physical capacity of a standard 10-meter circular spawning pool and incubation pools.
* **Spawning Cycles per Year (Default: 6 cycles)**:
  * *Why 6 cycles?* Carps only breed during the monsoon breeding window (typically from May to September, roughly 5-6 months). Since each breeding, hatching, and yolk-sac absorption cycle takes 5–6 days, a hatchery can easily run 6 cycles during this window, rotating their broodstock and staging operations across their nursery ponds.
* **Survival Rate (Default: 30%)**:
  * *Why 30%?* This is the standard survival rate from spawn to ready fingerling stage (100–150 mm) achieved in Bihar. Rearing fish in earthen ponds exposed to temperature spikes, heavy monsoon rain diluting water quality, and bacterial threats typically results in a 60–70% mortality rate, meaning only about 30% of spawn grow into saleable fingerlings.
* **Fingerling Selling Price (Default: ₹8.80 per piece)**:
  * *Why ₹8.80?* This is the average selling price for genetically improved Jayanti Rohu fingerlings in Begusarai, Bihar. Because local rearing capacity in Bihar is low, farmers pay a premium (between ₹8.50 and ₹9.80) to secure high-quality stocking-size seeds, which are far more resistant to disease than wild seeds.

---


## 3. The Mathematical Formulas

The Hatchery ROI Simulator calculates annual profits, margins, and the payback period based on the following step-by-step formulas:

### Step 1: Calculate Total Spawn Sourced/Produced per Year
The simulator starts with your **spawning capacity per cycle** (in millions of spawn) and the **number of cycles per year**. We convert millions into lakhs because spawn prices in India are traditionally quoted per lakh (100,000 pieces).

Since \(1 \text{ Million} = 10 \text{ Lakhs}\):

\[\text{Annual Spawn Capacity (Lakhs)} = \text{Capacity per Cycle (Millions)} \times 10 \times \text{Cycles per Year}\]

\[\text{Annual Spawn Count (Pieces)} = \text{Capacity per Cycle (Millions)} \times 1,000,000 \times \text{Cycles per Year}\]

### Step 2: Calculate Annual Fingerling Production
Only a fraction of the spawn survives to become saleable fingerlings. We apply the **Survival Rate (%)**:

\[\text{Annual Fingerling Production (Pieces)} = \text{Annual Spawn Count (Pieces)} \times \left( \frac{\text{Survival Rate \%}}{100} \right)\]

*(The result is rounded to the nearest whole fish)*

### Step 3: Calculate Spawn Sourcing Cost (Annual)
This is the cost of procuring the initial spawn. It is calculated per lakh:

\[\text{Annual Spawn Purchase Cost (₹)} = \text{Annual Spawn Capacity (Lakhs)} \times \text{Spawn Price per Lakh (₹)}\]

*The spawn price per lakh is determined by your choice of species (Rohu vs. Catla) and price source (e.g., ICAR-CIFA, Bihar Government benchmarks, or a custom price).*

### Step 4: Calculate Running Costs (OPEX)
To raise the surviving spawn to fingerlings, the hatchery incurs feed, health (medicine/supplements), and utility (electricity, labor, water) costs. In our simulator, these are calculated **per fingerling produced** (i.e., per surviving fish) to scale naturally with production volume:

* **Annual Feed Cost (₹)** = \(\text{Annual Fingerling Production} \times \text{Feed Cost per Fingerling (₹)}\) *(Default: ₹0.30)*
  * *Why ₹0.30?* A fingerling is reared to a size of 100–150 mm, which translates to a weight of about 10–15 grams. Over the 90 days of rearing, it consumes roughly 4 to 5 grams of supplementary feed (usually commercial floating micro-pellets or a high-protein rice bran/oil cake mixture). At a standard market feed price of ₹60–₹70 per kg, 5 grams of feed costs exactly ₹0.30 per surviving fish.
* **Annual Health Cost (₹)** = \(\text{Annual Fingerling Production} \times \text{Health Cost per Fingerling (₹)}\) *(Default: ₹0.10)*
  * *Why ₹0.10?* Rearing requires water quality treatments (applying agricultural lime, potassium permanganate sanitizer, and bleaching powder to sanitize ponds) as well as vaccines or vitamins (like Brood-Vac or probiotics) to prevent common bacterial infections like Aeromoniasis. For a typical rearing batch of 1 lakh (100,000) fingerlings, operators budget a total of ₹10,000 for treatments, which breaks down to ₹0.10 per fish.
* **Annual Utilities & Labor Cost (₹)** = \(\text{Annual Fingerling Production} \times \text{Utilities Cost per Fingerling (₹)}\) *(Default: ₹0.40)*
  * *Why ₹0.40?* This covers the electricity or diesel required to pump fresh groundwater and operate aerators, the wages for labor hired for pond excavation and netting harvests, and security staff for watch-and-ward duties. For a rearing batch of 1 lakh fingerlings, the overhead is about ₹40,000, which equals ₹0.40 per fish.

Add these to the Spawn Sourcing Cost to find the **Total Annual OPEX**:

\[\text{Total Annual OPEX (₹)} = \text{Annual Spawn Purchase Cost} + \text{Annual Feed Cost} + \text{Annual Health Cost} + \text{Annual Utilities Cost}\]


### Step 5: Calculate Annual Revenue
This is the total money earned from selling the produced fingerlings at the market rate:

\[\text{Annual Revenue (₹)} = \text{Annual Fingerling Production (Pieces)} \times \text{Selling Price per Fingerling (₹)}\]

### Step 6: Calculate Net Profit & Profit Margin
* **Annual Net Profit (₹)**:
  \[\text{Annual Net Profit} = \text{Annual Revenue} - \text{Total Annual OPEX}\]

* **Net Margin (%)**:
  \[\text{Net Margin \%} = \left( \frac{\text{Annual Net Profit}}{\text{Annual Revenue}} \right) \times 100\]

### Step 7: Calculate Capital Invested (CAPEX)
The setup cost (CAPEX) is estimated using the **Bihar Government Yojana (Scheme) Benchmarks**:
* **Base Hatchery Unit Cost**: **₹8,00,000** for a standard carp hatchery (up to 5 Million spawn capacity per cycle).
* **Linear Scale-up Cost**: If capacity exceeds 5 Million spawn per cycle, the construction costs scale up at a rate of **₹60,000** for every additional million spawn capacity.

$$\text{CAPEX (₹)} = \begin{cases} 
8,00,000 & \text{if Capacity} \le 5\text{ Million} \\
8,00,000 + (\text{Capacity} - 5) \times 60,000 & \text{if Capacity} > 5\text{ Million}
\end{cases}$$

> [!NOTE]
> Under government schemes like the **Mukhyamantri Talab Matsyiki Vikas Yojana** or the central **PMMSY (Pradhan Mantri Matsya Sampada Yojana)**, hatchery operators can receive **40% (General category) to 60% (Women/SC/ST)** subsidies on this CAPEX, making the actual out-of-pocket investment significantly lower.

### Step 8: Calculate Payback Period
The time (in years) required to recover the initial CAPEX investment from annual net profits:

\[\text{Payback Period (Years)} = \frac{\text{CAPEX (₹)}}{\text{Annual Net Profit (₹)}}\]

---

## 4. Concrete Example Walkthrough

Let's calculate the economics for a typical hatchery with the following inputs:
* **Species**: Jayanti Rohu (spawning Begusarai district, Bihar)
* **Capacity**: 5 Million spawn per cycle
* **Cycles per Year**: 6 cycles
* **Survival Rate**: 30% (standard benchmark)
* **Feed cost**: ₹0.30 per fingerling
* **Health cost**: ₹0.10 per fingerling
* **Utilities/Labor**: ₹0.40 per fingerling
* **Spawn Price**: ₹1,802 per lakh (Begusarai Rohu rate)
* **Fingerling Sell Price**: ₹8.80 per piece (Begusarai rate)

### Calculations:

1. **Annual Spawn Quantity**:
   * Lakhs: \(5 \times 10 \times 6 = 300 \text{ Lakh spawn per year}\)
   * Pieces: \(5 \times 1,000,000 \times 6 = 30,000,000 \text{ spawn per year}\)

2. **Annual Fingerlings Produced**:
   * \(30,000,000 \times (30 / 100) = 9,000,000 \text{ fingerlings}\)

3. **Annual Spawn Cost**:
   * \(300 \text{ Lakhs} \times ₹1,802 = ₹5,40,600\)

4. **Annual Rearing Expenses**:
   * Feed Cost: \(9,000,000 \times ₹0.30 = ₹27,00,000\)
   * Health Cost: \(9,000,000 \times ₹0.10 = ₹9,00,000\)
   * Utilities/Labor: \(9,000,000 \times ₹0.40 = ₹36,00,000\)
   * Total Rearing Cost: \(₹72,00,000\)

5. **Total Annual OPEX**:
   * \(₹5,40,600 \text{ (spawn)} + ₹72,00,000 \text{ (rearing)} = ₹77,40,600\)

6. **Annual Revenue**:
   * \(9,00,000 \text{ fingerlings} \times ₹8.80 = ₹7,92,00,000\) *(Gross Sales)*

7. **Annual Net Profit**:
   * \(₹7,92,00,000 - ₹77,40,600 = ₹7,14,59,400\)

8. **Net Profit Margin**:
   * \((₹7,14,59,400 / ₹7,92,00,000) \times 100 \approx 90.2\%\)

9. **Capital Expenditure (CAPEX)**:
   * Capacity is 5 Million (equal to base limit), so:
   * \(\text{CAPEX} = ₹8,00,000\)

10. **Payback Period**:
    * \(₹8,00,000 / ₹7,14,59,400 \approx 0.01 \text{ Years}\) *(Extremely fast payback due to high local selling price of fingerlings relative to spawn cost).*

---

## 5. Regional Benchmarks in Bihar

Hatchery economics vary greatly across Bihar due to regional seed demand, access to water, transport networks, and availability of quality spawn. The simulator uses the following database benchmarks (based on Gates Foundation field surveys):

| District | Rohu Spawn Cost (per Lakh) | Catla Spawn Cost (per Lakh) | Fingerling Sell Price (per Piece) |
|---|---|---|---|
| **Banka** | ₹2,050 | ₹2,094 | ₹8.50 |
| **Begusarai** | ₹1,802 | ₹2,252 | ₹8.80 |
| **Purnia** | ₹1,802 | ₹2,252 | ₹8.80 |
| **Darbhanga** | ₹2,167 | ₹2,667 | ₹9.80 |
| **Madhubani** | ₹2,167 | ₹2,667 | ₹9.80 |
| **Muzaffarpur** | ₹2,100 | ₹2,600 | ₹9.50 |
| **Samastipur** | ₹2,100 | ₹2,600 | ₹9.50 |
| **East Champaran** | ₹1,967 | ₹2,467 | ₹9.00 |
| **Other Districts (Default)** | ₹2,050 | ₹2,094 | ₹8.50 |

### Key Observations:
* **Spawn Sourcing Rates**: Districts like Darbhanga and Madhubani have higher spawn costs (up to ₹2,667/lakh for Catla) due to transportation surcharges from breeding stations in West Bengal or southern states.
* **Fingerling Pricing**: Northern districts (Darbhanga, Madhubani, Muzaffarpur) command premium selling prices (₹9.50–₹9.80 per piece) because of high concentrations of grow-out ponds and a relative shortage of local rearing capacity, which drives up demand for fingerlings.

---

## 6. Business Logic Rules & Biological Sensitivity

The business logic in the app accounts for several critical biological factors that influence these numbers:

* **Species Difficulty**: Catla is biologically more difficult to induce-spawn than Rohu, resulting in fewer eggs per kilogram of body weight. This is why Catla spawn prices are consistently ₹400–₹500 higher per lakh across all sources.
* **Enhanced Strains**: Stocking genetically improved strains like **Jayanti Rohu** or **Amrita Katla** typically yields a higher survival rate (up to 40% in rearing ponds compared to 25–30% for standard strains) due to their enhanced immune response and resistance to common bacterial infections like Aeromoniasis.
* **Seasonality Constraint**: In India, carps only spawn during the monsoon breeding window (typically late April to mid-September). While the simulator allows up to 12 cycles per year for calculation flexibility, a realistic commercial hatchery runs **6 to 8 cycles** during this 5-month window.
