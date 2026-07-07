import pandas as pd

# Load Excel file
df = pd.read_excel("Recommendation_Dataset.xlsx")

# Remove extra spaces from column names (good practice)
df.columns = df.columns.str.strip()

print("Columns found:", df.columns.tolist())

# Remove rows with missing CustomerID
df = df.dropna(subset=["CustomerID"])

# Remove negative or zero quantities (returns/cancellations)
df = df[df["Quantity"] > 0]

# Remove duplicate rows
df = df.drop_duplicates()

# Convert data types
df["CustomerID"] = df["CustomerID"].astype(int)
df["StockCode"] = df["StockCode"].astype(str)
df["Description"] = df["Description"].astype(str)

# Optional: calculate total amount
df["TotalAmount"] = df["Quantity"] * df["Price"]

# Save cleaned dataset
df.to_csv("cleaned_retail.csv", index=False)

print("✅ Data cleaned successfully!")
print("✅ Saved as cleaned_retail.csv")
print(f"Rows: {len(df)}")
print(f"Customers: {df['CustomerID'].nunique()}")