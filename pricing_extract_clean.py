import os
import re
import pandas as pd

# original path
in_path = '/Users/jackhoang/Desktop/airlast-s-management/pricing_csv/Updated_Flat_Rate_HVAC_Pricing_-__60_hr.csv'

# load
df = pd.read_csv(in_path)

# normalize headers
def clean(col: str) -> str:
    s = col.lower().strip()
    s = re.sub(r'[^0-9a-z]+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s.strip('_')

df.columns = [clean(c) for c in df.columns]

# split description
df[['code', 'description']] = df['description'].str.split(' ', n=1, expand=True)

# build output path in same folder
out_dir  = os.path.dirname(in_path)
out_path = os.path.join(out_dir, 'Updated_Flat_Rate_HVAC_Pricing_split.csv')

# save
df.to_csv(out_path, index=False)
print(f"Saved to {out_path}")