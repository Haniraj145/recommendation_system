import React, { useState } from "react";



function App() {

  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);

  const [customerCluster, setCustomerCluster] = useState(null);

  const [notFoundMessage, setNotFoundMessage] = useState("");

  const [customerQuantity, setCustomerQuantity] = useState(null);
  const [customerAvgPrice, setCustomerAvgPrice] = useState(null);
  const [clusterStats, setClusterStats] = useState([]);

  const [loading, setLoading] = useState(false);

  const [sortOption, setSortOption] = useState("popularity");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [searchTerm, setSearchTerm] = useState("");

const [totalClusters, setTotalClusters] = useState(4);

  const fetchRecommendations = () => {

    if (!userId) {
      alert("Please enter Customer ID");
      return;
    }

    let url = `http://127.0.0.1:5000/recommend?user=${userId}`;

    if (country)
      url += `&country=${country}`;

    setLoading(true);

    fetch(url)
      .then(res => res.json())

      .then(data => {

        setRecommendations(data.recommended_products || []);

        setHistory(data.history || []);

        setCustomerCluster(data.customer_cluster);

        // fix: surface the backend's cold-start message
        // (returned when a Customer ID has no purchase history)
        setNotFoundMessage(data.message || "");

        // fix: capture the customer's own Quantity/Price and each
        // cluster's characteristics, needed to explain *why* this
        // customer was grouped into their assigned cluster
        setCustomerQuantity(data.customer_quantity ?? null);
        setCustomerAvgPrice(data.customer_avg_price ?? null);
        setClusterStats(data.cluster_stats || []);

setTotalClusters(
    data.total_clusters || 4
);

        setLoading(false);

      })

      .catch(err => {

        console.log(err);

        setLoading(false);

      });

  };

  // -----------------------------
  // Sorting
  // -----------------------------

  const sortedRecommendations =
    [...recommendations].sort((a, b) => {

      if (sortOption === "price")
        return b.price - a.price;

      if (sortOption === "quantity")
        return b.quantity - a.quantity;

      return b.popularity - a.popularity;

    });

  // -----------------------------
  // Category Filter
  // -----------------------------

  const filteredRecommendations =

    categoryFilter === "all"

      ? sortedRecommendations

      : sortedRecommendations.filter(

          item => item.category === categoryFilter

        );

  // -----------------------------
  // Search
  // -----------------------------

  const finalRecommendations =

    filteredRecommendations.filter(

      item =>

        item.product

          .toLowerCase()

          .includes(

            searchTerm.toLowerCase()

          )

    );

  // -----------------------------
  // Categories
  // -----------------------------

  const categories = [

    "all",

    ...new Set(

      recommendations.map(

        item => item.category

      )

    )

  ];

  // -----------------------------
  // Product Images
  // -----------------------------

  const getImageForProduct = (desc) => {

    const lower = desc.toLowerCase();

    if (lower.includes("lantern"))
      return "https://source.unsplash.com/300x200/?lantern";

    if (lower.includes("mug"))
      return "https://source.unsplash.com/300x200/?coffee-mug";

    if (lower.includes("candle"))
      return "https://source.unsplash.com/300x200/?candle";

    if (lower.includes("toy"))
      return "https://source.unsplash.com/300x200/?toy";

    if (lower.includes("bag"))
      return "https://source.unsplash.com/300x200/?bag";

    return "https://source.unsplash.com/300x200/?shopping";
  };

  const clusterColors = [

    "#2563eb",

    "#16a34a",

    "#f59e0b",

    "#ef4444"

  ];

  // -----------------------------
  // Cluster Explanation Helpers
  // (fix: build a detailed, data-backed explanation of why this
  // customer landed in their assigned cluster, using the cluster
  // stats returned by the backend instead of just naming the cluster)
  // -----------------------------

  const ownClusterStats = clusterStats.find(
    (c) => c.cluster === customerCluster
  );

  const describePosition = (value, avg) => {
    if (value === null || avg === undefined) return "";
    const diffPercent = ((value - avg) / avg) * 100;

    if (Math.abs(diffPercent) < 10) {
      return "about the same as";
    }
    if (diffPercent > 0) {
      return `about ${Math.round(diffPercent)}% higher than`;
    }
    return `about ${Math.round(Math.abs(diffPercent))}% lower than`;
  };

  const otherClusters = clusterStats.filter(
    (c) => c.cluster !== customerCluster
  );

 
    return (
  <div className="min-h-screen bg-gradient-to-r from-blue-50 to-blue-100 p-8">
    <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-lg p-8">

      <h1 className="text-4xl font-extrabold text-center text-blue-700 mb-3">
        Retail Recommendation Dashboard
      </h1>

      <p className="text-center text-gray-600 text-lg mb-10">
        Customer Segmentation & Product Recommendation using <span className="font-semibold text-blue-700">K-Means Clustering</span>
      </p>

      {/* Input Section */}

      <div className="flex flex-col md:flex-row gap-4 mb-8">

        <input
          type="text"
          placeholder="Enter Customer ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="text"
          placeholder="Enter Country (Optional)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={fetchRecommendations}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Get Recommendations
        </button>

      </div>

      {/* Search & Sort */}

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">

        <input
          type="text"
          placeholder="Search Products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2"
        />

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >

          <option value="popularity">
            Sort by Popularity
          </option>

          <option value="price">
            Sort by Price
          </option>

          <option value="quantity">
            Sort by Quantity
          </option>

        </select>

      </div>

      {/* Category Chips */}

      <div className="flex flex-wrap gap-3 mb-8">

        {categories.map((cat, idx) => (

          <button
            key={idx}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full border transition ${
              categoryFilter === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-blue-100"
            }`}
          >

            {cat}

          </button>

        ))}

      </div>

 {/* ========================= */}
{/* K-MEANS INSIGHTS */}
{/* ========================= */}

{customerCluster !== null && (
  <>

    {/* K-Means Insight Card */}

    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg p-6 mb-6">

      <h2 className="text-2xl font-bold mb-5">
        K-Means Clustering Insights
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white/20 rounded-lg p-5">
          <p className="text-sm">Customer Segment</p>
          <h3 className="text-3xl font-bold mt-2">
            Cluster {customerCluster}
          </h3>
        </div>

        <div className="bg-white/20 rounded-lg p-5">
          <p className="text-sm">Algorithm</p>
          <h3 className="text-3xl font-bold mt-2">
            K-Means
          </h3>
        </div>

        <div className="bg-white/20 rounded-lg p-5">
          <p className="text-sm">Number of Clusters</p>
          <h3 className="text-3xl font-bold mt-2">
            {totalClusters}
          </h3>
        </div>

      </div>

      <div className="mt-6 border-t border-white/30 pt-4">
        <p className="leading-7">
          This customer belongs to{" "}
          <span className="font-bold">
            Cluster {customerCluster}
          </span>.
          Recommendations are generated by comparing this customer with
          other customers in the same cluster using the
          <span className="font-bold"> K-Means clustering algorithm</span>.
        </p>
      </div>

    </div>

    {/* Explanation Card */}

    <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-5 mb-8">

      <h3 className="text-lg font-semibold text-blue-700 mb-3">
        How K-Means Classified This Customer
      </h3>

      <p className="text-gray-700 leading-7">
        Customers are grouped based on their purchasing behaviour using
        the K-Means clustering algorithm. The model considers two features:
      </p>

      <ul className="list-disc ml-6 mt-3 text-gray-700 space-y-2">
        <li>
          <b>Total Quantity Purchased</b> – total number of products bought.
        </li>

        <li>
          <b>Average Product Price</b> – average price of purchased products.
        </li>
      </ul>

      <p className="text-gray-700 leading-7 mt-4">
        Customers with similar values are placed into the same cluster.
        This customer has been assigned to
        <span className="font-semibold text-blue-700">
          {" "}Cluster {customerCluster}
        </span>,
        therefore the recommended products are based on the purchasing
        patterns of other customers in the same cluster.
      </p>

    </div>

    {/* Detailed "Why This Cluster" Card */}

    {ownClusterStats && (

      <div className="bg-white border border-blue-200 rounded-lg p-6 mb-8 shadow-sm">

        <h3 className="text-lg font-semibold text-blue-700 mb-3">
          Why This Customer Was Grouped Into Cluster {customerCluster}
        </h3>

        <p className="text-gray-700 leading-7 mb-4">
          K-Means groups customers by measuring the distance between their{" "}
          <b>Total Quantity Purchased</b> and <b>Average Product Price</b>{" "}
          (scaled so both features are weighted fairly) and assigning them
          to whichever cluster centroid they sit closest to. Here is how
          this specific customer compares to the centroid of Cluster{" "}
          {customerCluster}:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Quantity Purchased</p>
            <p className="text-xl font-bold text-gray-800">
              {customerQuantity}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cluster {customerCluster} average:{" "}
              <b>{ownClusterStats.avg_quantity}</b>{" "}
              (range {ownClusterStats.min_quantity}–{ownClusterStats.max_quantity})
            </p>
            <p className="text-sm text-blue-700 mt-1">
              This customer is{" "}
              {describePosition(customerQuantity, ownClusterStats.avg_quantity)}{" "}
              the cluster average.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Average Product Price</p>
            <p className="text-xl font-bold text-gray-800">
              ${customerAvgPrice}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cluster {customerCluster} average:{" "}
              <b>${ownClusterStats.avg_price}</b>{" "}
              (range ${ownClusterStats.min_price}–${ownClusterStats.max_price})
            </p>
            <p className="text-sm text-blue-700 mt-1">
              This customer is{" "}
              {describePosition(customerAvgPrice, ownClusterStats.avg_price)}{" "}
              the cluster average.
            </p>
          </div>

        </div>

        <p className="text-gray-700 leading-7 mb-3">
          Cluster {customerCluster} contains{" "}
          <b>{ownClusterStats.customer_count}</b> customers in total. K-Means
          placed this customer here because, after scaling both features,
          their combined Quantity/Price profile was mathematically closer to
          this cluster's centroid than to any other cluster's centroid.
        </p>

        {otherClusters.length > 0 && (

          <div className="mt-4">

            <p className="text-sm font-semibold text-gray-600 mb-2">
              For comparison, here are the other clusters:
            </p>

            <div className="overflow-x-auto">

              <table className="min-w-full border rounded-lg text-sm">

                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Cluster</th>
                    <th className="px-3 py-2 text-center">Avg Quantity</th>
                    <th className="px-3 py-2 text-center">Avg Price</th>
                    <th className="px-3 py-2 text-center">Customers</th>
                  </tr>
                </thead>

                <tbody>
                  {otherClusters.map((c) => (
                    <tr key={c.cluster} className="border-t">
                      <td className="px-3 py-2">Cluster {c.cluster}</td>
                      <td className="px-3 py-2 text-center">{c.avg_quantity}</td>
                      <td className="px-3 py-2 text-center">${c.avg_price}</td>
                      <td className="px-3 py-2 text-center">{c.customer_count}</td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

    )}

  </>
)}

      {/* Recommendations Section */}

      <h2 className="text-2xl font-semibold mb-6">
        Recommended Products
          </h2>
      {/* Recommendations Section */}

{loading ? (
  <div className="flex justify-center items-center py-12">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
) : finalRecommendations.length > 0 ? (

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

    {finalRecommendations.map((item, index) => (

      <div
        key={index}
        className="bg-gray-50 border rounded-xl shadow hover:shadow-2xl transition duration-300 hover:-translate-y-1 hover:bg-blue-50 p-6"
      >

        <img
          src={getImageForProduct(item.product)}
          alt={item.product}
          className="w-full h-44 object-cover rounded-lg mb-4"
        />

        <div className="flex justify-between items-start">

          <h3 className="text-lg font-bold text-gray-800">
            {item.product}
          </h3>

          {item.popularity > 100 && (
            <span className="bg-yellow-400 text-white text-xs px-2 py-1 rounded-full">
              Top Seller
            </span>
          )}

        </div>

        <div className="space-y-2 mt-4 text-gray-600 text-sm">

          <p>
            <span className="font-semibold">
              Category:
            </span>{" "}
            {item.category}
          </p>

          <p>
            <span className="font-semibold">
              Price:
            </span>{" "}
            ${item.price}
          </p>

          <p>
            <span className="font-semibold">
              Quantity Purchased:
            </span>{" "}
            {item.quantity}
          </p>

          <p>
            <span className="font-semibold">
              Popularity Score:
            </span>{" "}
            {item.popularity}
          </p>

        </div>

        <div className="mt-4">

          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-full">
            Recommended from Cluster {item.cluster}
          </span>

        </div>

        <button
          className="mt-5 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
        >
          Add to Cart
        </button>

      </div>

    ))}

  </div>

) : (

  <div className="text-center py-12">

    <h3 className="text-2xl font-semibold text-gray-500">
      No Recommendations Found
    </h3>

    <p className="text-gray-400 mt-2">
      {/* fix: show the backend's specific cold-start message
          when present, otherwise fall back to the generic hint */}
      {notFoundMessage || "Enter a valid Customer ID to view recommendations."}
    </p>

  </div>

)}

{/* Purchase History */}

{history.length > 0 && (

  <div className="mt-12">

    <h2 className="text-2xl font-semibold mb-6">
      Previously Purchased Products
    </h2>

    <div className="overflow-x-auto">

      <table className="min-w-full border rounded-lg overflow-hidden">

        <thead className="bg-blue-600 text-white">

          <tr>

            <th className="px-4 py-3 text-left">
              Product
            </th>

            <th className="px-4 py-3 text-center">
              Quantity
            </th>

            <th className="px-4 py-3 text-center">
              Price
            </th>

          </tr>

        </thead>

        <tbody>

          {history.map((item, index) => (

            <tr
              key={index}
              className="border-b hover:bg-gray-50"
            >

              <td className="px-4 py-3">
                {item.Description}
              </td>

              <td className="px-4 py-3 text-center">
                {item.Quantity}
              </td>

              <td className="px-4 py-3 text-center">
                ${item.Price}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>

)}

    </div>
  </div>
);

}

export default App;