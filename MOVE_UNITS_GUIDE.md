# How to Move Existing Units to Village Shoppes at Creekside

## Overview

This guide explains how to move existing units from their current location to the new Village Shoppes at Creekside location under 5 Rivers.

## Prerequisites

- Village Shoppes at Creekside location must already be created
- Access to unit management in the admin panel
- List of unit numbers to move: 210, 1015, 265, 143, 1540, 175, 275

## Method 1: Individual Unit Updates (UI)

### Step 1: Access Unit Management

1. Navigate to **Units** in the admin panel
2. Find each unit you want to move (by unit number)
3. Click **Edit** for each unit

### Step 2: Update Each Unit

For each unit (210, 1015, 265, 143, 1540, 175, 275):

1. **Open the unit edit form**
2. **Change the location** to "Village Shoppes at Creekside"
3. **Update billing entity** to "VS Creekside, LP c/o 5Rivers, LLC"
4. **Save the changes**

### Step 3: Verify the Move

1. Navigate to **5 Rivers** company
2. Click on **Village Shoppes at Creekside** location
3. Verify all 7 units are now listed there
4. Check that all units have the correct billing entity

## Method 2: Bulk Database Update (Advanced)

### Step 1: Get Required IDs

```sql
-- Get the Village Shoppes location ID
SELECT id, name FROM locations WHERE name = 'Village Shoppes at Creekside';

-- Get current location ID of units to move
SELECT DISTINCT location_id, l.name
FROM units u
JOIN locations l ON u.location_id = l.id
WHERE u.unit_number IN ('210', '1015', '265', '143', '1540', '175', '275');
```

### Step 2: Execute the Move

```sql
-- Replace 'VILLAGE_SHOPPES_LOCATION_ID' with actual location ID
-- Replace 'CURRENT_LOCATION_ID' with actual current location ID
UPDATE units
SET
  location_id = 'VILLAGE_SHOPPES_LOCATION_ID',
  billing_entity = 'VS Creekside, LP c/o 5Rivers, LLC',
  updated_at = NOW()
WHERE unit_number IN ('210', '1015', '265', '143', '1540', '175', '275')
AND location_id = 'CURRENT_LOCATION_ID';
```

### Step 3: Verify the Move

```sql
-- Check that units are now in the correct location
SELECT
  u.unit_number,
  u.billing_entity,
  l.name as location_name,
  c.name as company_name
FROM units u
JOIN locations l ON u.location_id = l.id
JOIN companies c ON l.company_id = c.id
WHERE l.name = 'Village Shoppes at Creekside'
ORDER BY u.unit_number;
```

## Method 3: Using the Bulk Move Script

1. **Open the SQL script**: `bulk_move_units_script.sql`
2. **Replace placeholders**:
   - `CURRENT_LOCATION_ID` with the actual current location ID
   - `VILLAGE_SHOPPES_LOCATION_ID` with the Village Shoppes location ID
3. **Execute the script** in your database management tool
4. **Review the results** to ensure all units were moved correctly

## Important Considerations

### Before Moving Units:

- **Backup your database** before making bulk changes
- **Check for existing jobs** associated with these units
- **Verify unit numbers** are correct before moving
- **Ensure Village Shoppes location exists** and is properly set up

### After Moving Units:

- **Verify all units** are in the new location
- **Check billing entities** are updated correctly
- **Review any existing jobs** to ensure they still reference the correct units
- **Update any documentation** that references the old location

### Potential Issues:

- **Existing jobs** may need to be updated if they reference the old location
- **Unit conflicts** if unit numbers already exist in the new location
- **Billing entity changes** may affect invoicing

## Verification Checklist

After moving units, verify:

- [ ] All 7 units are now in Village Shoppes at Creekside
- [ ] All units have billing entity: "VS Creekside, LP c/o 5Rivers, LLC"
- [ ] Unit numbers are correct: 210, 1015, 265, 143, 1540, 175, 275
- [ ] Location is properly nested under 5 Rivers company
- [ ] No units remain in the old location (if that was the intention)
- [ ] Existing jobs still reference the correct units

## Troubleshooting

### If units don't appear in the new location:

- Check that the Village Shoppes location was created successfully
- Verify the location_id in the UPDATE statement
- Check for any database constraints or foreign key issues

### If billing entity didn't update:

- Manually update billing entities through the UI
- Check for any validation rules on the billing_entity field

### If existing jobs are affected:

- Review job details to ensure they still reference the correct units
- Update job locations if necessary
- Check that job assignments are still valid
