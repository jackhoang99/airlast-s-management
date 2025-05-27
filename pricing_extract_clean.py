import re
import pandas as pd

# 1. load
df = pd.read_csv(
    '/Users/jackhoang/Desktop/airlast-s-management/pricing_csv/'
    'Updated_Flat_Rate_HVAC_Pricing_-__60_hr.csv'
)

# 2. normalize EVERY header:
def clean(col: str) -> str:
    # lowercase
    s = col.lower().strip()
    # replace any non-alphanumeric runs with underscore
    s = re.sub(r'[^0-9a-z]+', '_', s)
    # collapse multiple underscores
    s = re.sub(r'_+', '_', s)
    # strip leading/trailing underscores
    return s.strip('_')

df.columns = [clean(c) for c in df.columns]

# now all of these:
#   "Flat Rate (Non-Contract)" → "flat_rate_non_contract"
#   "Flat Rate (PM Contract)"  → "flat_rate_pm_contract"
#   "Total Base Cost"          → "total_base_cost"
#   etc.

# 3. split your description field
df[['code', 'description']] = df['description'].str.split(' ', n=1, expand=True)


# 5. save
df.to_csv('Updated_Flat_Rate_HVAC_Pricing_split.csv', index=False)
