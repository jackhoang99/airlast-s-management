# Village Shoppes at Creekside Setup Guide

## Overview

This guide will help you set up the Village Shoppes at Creekside location under 5 Rivers with all the specified units and billing entity.

## Prerequisites

- Access to the admin panel
- 5 Rivers company should already exist in the system

## Step-by-Step Setup

### Step 1: Find 5 Rivers Company

1. Navigate to **Companies** in the admin panel
2. Search for "5 Rivers" or "5Rivers"
3. Note the company ID (you'll need this)

### Step 2: Create Village Shoppes at Creekside Location

1. Navigate to **Locations** → **Add Location**
2. Fill in the following details:
   - **Company**: Select "5 Rivers" (or the exact company name)
   - **Location Name**: `Village Shoppes at Creekside`
   - **Address**: `858 GA-120 Hwy`
   - **City**: `Lawrenceville`
   - **State**: `GA`
   - **ZIP**: `30043`
   - **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
3. Click **Save**

### Step 3: Create Units

For each unit, navigate to **Units** → **Add Unit** and create:

#### Unit 210 - Mila Nail Salon

- **Unit Number**: `210`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Primary Contact Type**: `Tenant` (optional)
- **Office**: `Main Office`

#### Unit 1015

- **Unit Number**: `1015`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

#### Unit 265

- **Unit Number**: `265`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

#### Unit 143

- **Unit Number**: `143`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

#### Unit 1540

- **Unit Number**: `1540`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

#### Unit 175

- **Unit Number**: `175`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

#### Unit 275

- **Unit Number**: `275`
- **Status**: `Active`
- **Billing Entity**: `VS Creekside, LP c/o 5Rivers, LLC`
- **Office**: `Main Office`

### Step 4: Verify Setup

1. Navigate to the **5 Rivers** company page
2. Verify that **Village Shoppes at Creekside** appears under locations
3. Click on the location to verify all 7 units are listed
4. Check that all units have the correct billing entity: `VS Creekside, LP c/o 5Rivers, LLC`

## Important Notes

- **Billing Entity**: All units and the location should have `VS Creekside, LP c/o 5Rivers, LLC` as the billing entity
- **Unit 210**: This is specifically for Mila Nail Salon - you may want to add tenant contact information
- **Address**: The location address is `858 GA-120 Hwy, Lawrenceville, GA 30043`
- **Parent Company**: Everything should be under the 5 Rivers company

## Troubleshooting

- If you can't find 5 Rivers company, you may need to create it first
- If the billing entity field is not available, check the form fields in the location/unit creation forms
- Make sure all unit numbers are entered exactly as specified (210, 1015, 265, 143, 1540, 175, 275)

## Alternative: Database Direct Setup

If you prefer to set this up directly in the database, use the SQL script provided in `setup_village_shoppes_creekside.sql` (you'll need to replace the placeholder IDs with actual company and location IDs).
