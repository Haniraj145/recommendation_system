from flask import Flask, request, jsonify
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==============================
# Load Dataset
# ==============================

data = pd.read_csv("cleaned_retail.csv")

# Remove any leading/trailing spaces from column names
data.columns = data.columns.str.strip()

# Rename columns so the rest of the code works unchanged
data.rename(columns={
    "CustomerID": "Customer ID"
}, inplace=True)

print(data.columns)

# ==============================
# Customer Product Matrix
# ==============================

customer_product = data.pivot_table(
    index="Customer ID",
    columns="Description",
    values="Quantity",
    aggfunc="sum"
).fillna(0)

# ==============================
# Customer Summary
# ==============================
customer_summary = data.groupby("Customer ID").agg({
    "Quantity": "sum",
    "Price": "mean",
    "TotalAmount": "sum"
}).reset_index()

# ==============================
# K-Means Clustering
# ==============================

K = 4

kmeans = KMeans(
    n_clusters=K,
    random_state=42,
    n_init=10
)

customer_summary["Cluster"] = kmeans.fit_predict(
    customer_summary[["Quantity", "Price"]]
)

# ==============================
# PCA for Visualization
# ==============================
pca = PCA(n_components=2)

pca_points = pca.fit_transform(
    customer_summary[["Quantity", "Price", "TotalAmount"]]
)

customer_summary["x"] = pca_points[:, 0]
customer_summary["y"] = pca_points[:, 1]
# ==============================
# Category Inference
# ==============================

def infer_category(description):

    desc = str(description).lower()

    if "lantern" in desc or "candle" in desc:
        return "Home Decor"

    elif "toy" in desc or "game" in desc:
        return "Toys"

    elif "mug" in desc or "cup" in desc or "plate" in desc:
        return "Kitchen"

    elif "bag" in desc:
        return "Accessories"

    elif "box" in desc:
        return "Storage"

    else:
        return "General"


# ==============================
# Home
# ==============================

@app.route("/")
def home():
    return "Retail Recommendation API is Running."


# ==============================
# Recommendation API
# ==============================

@app.route("/recommend", methods=["GET"])
def recommend():

    user = request.args.get("user")
    country = request.args.get("country")

    if not user:
        return jsonify({
            "error": "Customer ID required"
        })

    user = int(user)

    filtered_data = data

    if country:
        filtered_data = filtered_data[
            filtered_data["Country"].str.lower() == country.lower()
        ]

    # Customer not found
    if user not in customer_summary["Customer ID"].values:

        return jsonify({
            "recommended_products": [],
            "history": [],
            "customer_cluster": None,
            "cluster_distribution": [],
            "scatter": []
        })

    # ==============================
    # User Cluster
    # ==============================

    user_cluster = int(
        customer_summary.loc[
            customer_summary["Customer ID"] == user,
            "Cluster"
        ].values[0]
    )

    similar_customers = customer_summary[
        customer_summary["Cluster"] == user_cluster
    ]["Customer ID"]

    # ==============================
    # Product Recommendation
    # ==============================

    recommended_items = (

        filtered_data[
            filtered_data["Customer ID"].isin(similar_customers)
        ]

        .assign(weight=lambda x: x["Quantity"] * x["Price"])

        .groupby(["Description", "Price"])

        .agg({

            "Quantity": "sum",

            "weight": "sum"

        })

        .sort_values("weight", ascending=False)

        .head(10)

        .reset_index()

    )

    recommendations = []

    for _, row in recommended_items.iterrows():

        recommendations.append({

            "product": row["Description"],

            "price": float(round(row["Price"], 2)),

            "quantity": int(row["Quantity"]),

            "category": infer_category(row["Description"]),

            "popularity": float(round(row["weight"], 2)),

            "cluster": user_cluster

        })

    # ==============================
    # Purchase History
    # ==============================

    history = data[
        data["Customer ID"] == user
    ][
        ["Description", "Quantity", "Price"]
    ].head(10)

    history = history.to_dict(orient="records")

    # ==============================
    # Cluster Distribution
    # ==============================

    cluster_distribution = (

        customer_summary

        .groupby("Cluster")

        .size()

        .reset_index(name="Customers")

        .to_dict(orient="records")

    )

    # ==============================
    # Scatter Data
    # ==============================

    scatter = []

    for _, row in customer_summary.iterrows():

        scatter.append({

            "customerId": int(row["Customer ID"]),

            "cluster": int(row["Cluster"]),

            "x": float(row["x"]),

            "y": float(row["y"]),

            "selected": int(row["Customer ID"]) == user

        })

    # ==============================
    # Customer Statistics
    # ==============================

    customer_info = customer_summary[
        customer_summary["Customer ID"] == user
    ].iloc[0]

    return jsonify({

        "customer_cluster": user_cluster,

        "total_clusters": K,

        "customer_quantity": int(customer_info["Quantity"]),

        "customer_avg_price": round(float(customer_info["Price"]), 2),

        "recommended_products": recommendations,

        "history": history,

        "cluster_distribution": cluster_distribution,

        "scatter": scatter

    })


# ==============================
# Run Server
# ==============================

if __name__ == "__main__":
    app.run(debug=True)