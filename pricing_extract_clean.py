import pandas as pd

# 1. load
df = pd.read_csv('Updated_Flat_Rate_HVAC_Pricing_-__60_hr.csv')

# 2. split
#    - expand=True returns a DataFrame of two columns
#    - n=1 ensures we only split at the first space
df[['Code', 'Code Description']] = df['Description'].str.split(' ', n=1, expand=True)

# 3. (optional) drop the old Description column if you no longer need it
# df = df.drop(columns=['Description'])

# 4. save
df.to_csv('Updated_Flat_Rate_HVAC_Pricing_split.csv', index=False)
