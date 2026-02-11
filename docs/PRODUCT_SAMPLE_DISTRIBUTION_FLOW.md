# Product Sample Distribution System - Complete Data Flow

## Overview
This document explains the complete, dynamic data flow for the Product Sample Distribution system between the Manager Dashboard and MR Dashboard.

## System Architecture

### 1. Manager Dashboard - Product Samples Module
**Location:** `Manager-Dashboard/samples.html` and `assets/js/samples.js`

#### Features Implemented:
✅ **Dynamic MR Dropdown** - Fetches all MRs assigned to the logged-in manager
✅ **Product Distribution** - Allows manager to distribute samples to specific MRs
✅ **Recent Distributions Table** - Shows all recent distributions with Date, Product, MR, Quantity, and Recipient
✅ **Stock Management** - Tracks total stock, distributed, and remaining quantities

#### Data Flow (Manager → MR):
1. **MR List Population:**
   - Fetches MRs using `/api/users?manager={managerName}&role=MR`
   - Uses robust manager identification (Name OR Email)
   - Populates dropdown in "Distribute Product Sample" modal

2. **Distribution Process:**
   ```javascript
   When Manager distributes sample:
   ├── Reduces Manager's warehouse stock (MR_STOCK_API)
   ├── Creates distribution record (DISTRIBUTIONS_API)
   └── Adds stock to MR's inventory (STOCK_RECEIVED_API)
   ```

3. **Recent Distributions Display:**
   - Fetches from `/api/distributions?userName={managerName}`
   - Shows in "Recent Distributions" table
   - Displays: Date, Product Name, MR Name, Quantity, Recipient

### 2. MR Dashboard - Product Samples Module
**Location:** `MR-Dashboard/product-sample.html` and `assets/js/product-sample.js`

#### Features Implemented:
✅ **Product Inventory Table** - Shows all products assigned to the MR
✅ **Dynamic Stock Calculation** - Calculates: Total Received, Total Distributed, Remaining Stock
✅ **Distribution History** - View detailed distribution history per product

#### Data Flow (Receives from Manager):
1. **Stock Received:**
   - Fetches from `/api/stock-received?userName={mrName}`
   - Calculates "Total Received" for each product

2. **Stock Distributed:**
   - Fetches from `/api/dcrs?mrName={mrName}`
   - Extracts `samplesGiven` from each DCR
   - Calculates "Total Distributed" for each product

3. **Remaining Stock Calculation:**
   ```javascript
   Remaining Stock = Total Received - Total Distributed
   ```

4. **Distribution Details Modal:**
   - Shows all DCRs where the product was distributed
   - Displays: Date/Time, Doctor/Location, Quantity, DCR Remarks

## API Endpoints Used

### Manager Dashboard APIs:
- `GET /api/users?manager={name}&role=MR` - Fetch assigned MRs
- `GET /api/mr-stock?userName={managerName}` - Fetch manager's warehouse stock
- `PUT /api/mr-stock/{productId}?userName={managerName}` - Update stock after distribution
- `POST /api/distributions` - Create distribution record
- `POST /api/stock-received` - Add stock to MR's inventory
- `GET /api/distributions?userName={managerName}` - Fetch distribution history

### MR Dashboard APIs:
- `GET /api/mr-stock?userName={mrName}` - Fetch MR's product list
- `GET /api/stock-received?userName={mrName}` - Fetch received stock history
- `GET /api/dcrs?mrName={mrName}` - Fetch submitted DCRs for distribution calculation

## Complete User Journey

### Scenario: Manager distributes "Azithromycin" to MR "Rajesh Kumar"

#### Step 1: Manager Dashboard
1. Manager opens "Product Samples" page
2. Clicks "Distribute Sample" button
3. Modal opens with:
   - **Product Dropdown:** Shows all available products (e.g., Azithromycin)
   - **MR Dropdown:** Shows all assigned MRs (e.g., Rajesh Kumar) ✅ **FIXED**
   - **Quantity:** Enter amount (e.g., 50 units)
   - **Recipient Type:** Doctor/Chemist/Hospital
   - **Recipient Name:** Enter name
   - **Purpose/Notes:** Distribution notes

4. Clicks "Distribute Sample"
5. System performs:
   ```
   ├── Reduces Manager warehouse stock: Azithromycin (-50)
   ├── Creates distribution record in database
   └── Adds to Rajesh Kumar's stock: Azithromycin (+50)
   ```

6. "Recent Distributions" table updates immediately showing:
   ```
   Date       | Product        | MR            | Quantity | Recipient
   07-Feb-2026| Azithromycin  | Rajesh Kumar  | 50       | Dr. Sharma
   ```
   ✅ **FIXED**

#### Step 2: MR Dashboard (Rajesh Kumar)
1. Rajesh logs into MR Dashboard
2. Opens "Product Samples" page
3. Sees "Product Samples Inventory & Distribution Report" table:
   ```
   Sr. | Product Name  | Total Received | Total Distributed | Remaining Stock
   1   | Azithromycin  | 50            | 0                 | 50
   ```
   ✅ **FIXED**

4. When Rajesh submits a DCR distributing 10 units to a doctor:
   - Total Distributed updates to: 10
   - Remaining Stock updates to: 40

5. Clicks "View Details" to see distribution history:
   ```
   Date/Time        | Doctor/Location      | Quantity | DCR Remarks
   07-Feb-2026 2:30 | Dr. Sharma, Delhi   | 10       | Sample given
   ```

## Key Improvements Made

### 1. Manager Dashboard - Samples Module
✅ **Robust MR Fetching:** Uses same logic as mrs.js, targets.js, tasks.js
✅ **Dynamic MR Dropdown:** Populated from backend, not static
✅ **Distribution Tracking:** All distributions saved to backend
✅ **Recent Distributions:** Dynamically fetched and displayed

### 2. MR Dashboard - Product Samples Module
✅ **Dynamic Stock Calculation:** Based on received stock and DCRs
✅ **No Static Data:** All data fetched from backend APIs
✅ **Distribution History:** Shows complete audit trail

### 3. Backend Integration
✅ **Manager Identity Resolution:** Backend accepts both Name and Email
✅ **Cross-Module Consistency:** All modules use same fetching pattern
✅ **Data Persistence:** All distributions permanently saved

## Testing Checklist

### Manager Dashboard:
- [ ] MR dropdown shows all assigned MRs (created from any module)
- [ ] Distribution creates record in "Recent Distributions"
- [ ] Manager's warehouse stock decreases after distribution
- [ ] MR's stock increases after distribution

### MR Dashboard:
- [ ] Products distributed by manager appear in inventory table
- [ ] "Total Received" matches distributed quantity
- [ ] "Total Distributed" updates when DCR submitted
- [ ] "Remaining Stock" = Total Received - Total Distributed
- [ ] "View Details" shows distribution history from DCRs

## Database Schema (Implied)

### distributions table:
```sql
{
  id: number,
  date: string,
  product: string,
  mr: string,
  quantity: number,
  recipient: string,
  notes: string,
  userName: string (manager who distributed)
}
```

### stock_received table:
```sql
{
  id: number,
  productId: string,
  quantity: number,
  date: string,
  userName: string (MR who received),
  notes: string
}
```

### dcrs table:
```sql
{
  id: number,
  mrName: string,
  doctorName: string,
  clinicLocation: string,
  dateTime: string,
  samplesGiven: [
    {
      productId: string,
      quantity: number
    }
  ],
  remarks: string
}
```

## Conclusion

The Product Sample Distribution system now has **complete, dynamic data flow** from Manager Dashboard to MR Dashboard. All data is:
- ✅ Fetched from backend APIs
- ✅ Properly synchronized across modules
- ✅ Persistently stored in database
- ✅ Displayed in real-time without page refresh

The system ensures that when a Manager distributes samples to an MR, the MR immediately sees the updated inventory in their dashboard, and all distribution history is properly tracked and auditable.
