
# Hospital Portal Enhancement Plan

## Current State Analysis

After reviewing the codebase, here's what I found:

### Working Features
- **Schedule Module**: Appointment scheduling, slot setup, and booking work correctly
- **Overview Page**: Dashboard with stats works
- **Billing Page**: Patient billing with items, taxes, discounts is functional
- **IPD/OPD Pages**: Basic structure exists with dialogs for new entries
- **Pharmacy Dispensing/Billing**: Core billing workflow exists
- **Pharmacy Purchase List**: Fully functional with filters and export

### Partially Working / Placeholder Features
| Module | Current State | Issues |
|--------|---------------|--------|
| **EHR** | Shows patient queue only | No full EHR functionality (medical history, vitals, notes) |
| **Laboratory** | LabBilling works, Work Order is placeholder | No sample collection, result entry, or report generation |
| **Reports** | Static cards with no functionality | No actual report generation or data visualization |
| **Pharmacy Inventory** | View-only | No add/edit medicine functionality |
| **Lab Tests Master** | Missing | No way to manage lab test catalog |

### Database Tables Available
The following tables already exist and can be utilized:
- `lab_orders` - For lab test orders with results
- `lab_tests` - Lab test master catalog
- `pharmacy_inventory` - Medicine stock
- `pharmacy_dispensations` - Dispensing records
- `pharmacy_purchases` - Purchase from suppliers
- `pharmacy_suppliers` - Supplier master
- `opd_visits` - OPD visit records
- `ipd_admissions` - IPD admission records
- `billing` - Unified billing records
- `documents` - Patient documents (for reports)

---

## Implementation Plan

### Phase 1: Laboratory Module (Priority: High)

**1.1 Lab Test Master (Lab Component)**
- Add/Edit/Delete lab tests in catalog
- Fields: test name, code, price, normal range, sample type, department
- Connect to existing `lab_tests` table

**1.2 Lab Work Order**
- Create work orders when tests are billed
- Show pending samples to collect
- Mark sample collected with timestamp
- Assign to technician
- Uses `lab_orders` table with status workflow: `ordered` -> `sample_collected` -> `processing` -> `completed`

**1.3 Lab Result Entry**
- Enter test results against work orders
- Compare with normal ranges (auto-flag abnormal values)
- Save results to `lab_orders.results` JSON field
- Mark order as complete

**1.4 Lab History**
- Search patient lab history
- View past results with date filtering
- Print/export lab reports

---

### Phase 2: Pharmacy Module Enhancements

**2.1 Add Medicine to Inventory**
- Dialog to add new medicines with batch, expiry, quantity, price
- Low stock alerts based on reorder level
- Stock adjustment functionality

**2.2 Supplier Management**
- Add/Edit suppliers with GSTIN, contact details
- View supplier purchase history

**2.3 New Purchase Entry**
- Record medicine purchases from suppliers
- Auto-update inventory quantities
- GST calculations (CGST/SGST/IGST)

---

### Phase 3: EHR Module Enhancement

**3.1 Patient Medical Record View**
- When doctor clicks "Patient Dashboard", show:
  - Demographics & vitals
  - Medical history (diagnoses, allergies)
  - Current medications
  - Recent lab results
  - Document viewer (prescriptions, reports)

**3.2 Consultation Notes**
- Add clinical notes during visit
- Diagnosis entry with ICD codes (optional)
- Prescription writer (connects to pharmacy)
- Order lab tests from EHR

**3.3 Visit History**
- Timeline of all patient visits
- View past consultation notes
- Track treatment progress

---

### Phase 4: Reports & Analytics

**4.1 Patient Statistics Report**
- Date range filter
- New vs returning patients
- Gender/age distribution charts
- Department-wise patient count

**4.2 Financial Reports**
- Daily/monthly revenue summary
- Payment method breakdown
- Outstanding dues aging report
- Department-wise revenue

**4.3 Inventory Reports**
- Stock value report
- Near-expiry medicines
- Low stock alerts
- Medicine consumption trends

**4.4 Doctor Performance**
- Patients seen per doctor
- Average consultation time
- Revenue generated
- Appointment completion rate

---

## Technical Implementation Details

### Database Changes Required
No new tables needed - all required tables exist. Minor additions:
- Add `sample_collected_at`, `collected_by` columns to `lab_orders`
- Add `technician_id` to `lab_orders` for assignment

### New Components to Create

| Component | Purpose |
|-----------|---------|
| `LabTestMaster.tsx` | CRUD for lab tests catalog |
| `LabWorkOrderList.tsx` | Active work orders with status |
| `LabResultEntry.tsx` | Enter and save test results |
| `LabReportViewer.tsx` | View/print lab reports |
| `AddMedicineDialog.tsx` | Add medicine to inventory |
| `SupplierManagement.tsx` | Manage pharmacy suppliers |
| `NewPurchaseDialog.tsx` | Record new purchases |
| `PatientEHRView.tsx` | Full patient medical record |
| `ConsultationNotes.tsx` | Add/view consultation notes |
| `ReportGenerator.tsx` | Generate various reports |
| `ReportCharts.tsx` | Recharts-based visualizations |

### Integration Points

```text
+------------------+     +------------------+
|   EHR Console    |---->| Order Lab Tests  |
+------------------+     +------------------+
         |                       |
         v                       v
+------------------+     +------------------+
| Write Prescription| --> | Pharmacy Billing |
+------------------+     +------------------+
         |                       |
         v                       v
+------------------+     +------------------+
|  Create OPD Visit |    | Update Inventory |
+------------------+     +------------------+
```

---

## Implementation Order

1. **Week 1**: Laboratory Module
   - Lab Test Master (add/edit tests)
   - Work Order workflow (sample collection, processing)
   - Result entry with normal range comparison

2. **Week 2**: Pharmacy Enhancements
   - Add medicine to inventory
   - Supplier management
   - Purchase entry workflow

3. **Week 3**: EHR Enhancement
   - Patient medical record view
   - Consultation notes
   - Order tests/medicines from EHR

4. **Week 4**: Reports
   - Patient statistics with charts
   - Financial reports
   - Inventory reports
   - Export to PDF/CSV

---

## Summary

This plan transforms the hospital portal from a basic structure into a fully functional HMS by:

1. **Completing the Lab workflow**: From test ordering to result delivery
2. **Enabling inventory management**: Full stock control for pharmacy
3. **Building a proper EHR**: Complete patient medical records
4. **Adding analytics**: Data-driven insights with visual reports

All features will integrate with existing database tables and maintain the current UI patterns for consistency.
