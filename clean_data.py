import pandas as pd

# Load Excel file
df = pd.read_excel("online_retail_II.xlsx")

# Remove rows with missing Customer ID
df = df.dropna(subset=['Customer ID'])

# Remove negative or zero quantities (returns or errors)
df = df[df['Quantity'] > 0]

# Remove duplicates
df = df.drop_duplicates()

# Optional: convert data types
df['Customer ID'] = df['Customer ID'].astype(int)
df['StockCode'] = df['StockCode'].astype(str)
df['Description'] = df['Description'].astype(str)

# Save cleaned data
df.to_csv("cleaned_retail.csv", index=False)

print("✅ Data cleaned and saved as cleaned_retail.csv")
