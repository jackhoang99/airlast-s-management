import pandas as pd
import re
import os

def clean(col: str) -> str:
    """Lowercase, replace non-alphanumeric runs with '_', collapse multiple '_'."""
    s = col.lower().strip()
    s = re.sub(r'[^0-9a-z]+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s.strip('_')

# Paths
in_path  = '/Users/jackhoang/Desktop/airlast-s-management/customer_csv/Airlast Location and Billing Entity Customer Information - 5.22.25 - Sheet1.csv'
out_dir  = os.path.dirname(in_path)
out_path = os.path.join(out_dir, 'Updated_Customer.csv')

# 1. Load and normalize headers
df = pd.read_csv(in_path)
df.columns = [clean(c) for c in df.columns]

# 2. Drop unwanted columns if present
wanted = [
    'location_import_id', 'ref_number', 'id', 'scheduling_comments',
    'tech_comments', 'regions', 'service_lines',
    'primary_contact_mobile', 'primary_contact_alternate_phone',
    'company_import_id', 'billing_comments', 'tags', 'comments', 'store_number'
]
to_drop = [c for c in wanted if c in df.columns]
df = df.drop(columns=to_drop)

# 3. Split street into location_street + unit
pattern = r'^(.*?)\s+(Suite.*|Unit.*|Apt.*|#.*|Apartment.*)$'
split = df['street'].str.extract(pattern, expand=True)

# If no match, group1 & group2 are NaN → fill group1 with original street, group2 with ''
df['location_street'] = split[0].fillna(df['street'])
df['unit']            = split[1].fillna('')

# 4. Drop the original street column
df = df.drop(columns=['street'])

# 5. Save cleaned CSV
df.to_csv(out_path, index=False)
print(f"Saved cleaned file to {out_path}")