// Currency configuration
const CURRENCY_FORMATS = {
  USD: { symbol: "$", code: "USD", locale: "en-US" },
  EUR: { symbol: "€", code: "EUR", locale: "de-DE" },
  GBP: { symbol: "£", code: "GBP", locale: "en-GB" },
  JPY: { symbol: "¥", code: "JPY", locale: "ja-JP" },
  CAD: { symbol: "C$", code: "CAD", locale: "en-CA" },
  AUD: { symbol: "A$", code: "AUD", locale: "en-AU" },
  INR: { symbol: "₹", code: "INR", locale: "en-IN" },
  CNY: { symbol: "¥", code: "CNY", locale: "zh-CN" },
  BRL: { symbol: "R$", code: "BRL", locale: "pt-BR" },
  ZAR: { symbol: "R", code: "ZAR", locale: "en-ZA" },
  NGN: { symbol: "₦", code: "NGN", locale: "en-NG" },
};

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Set current date in header
  const currentDateElement = document.getElementById("current-date");
  currentDateElement.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Set default date to today in transaction form
  document.getElementById("date").valueAsDate = new Date();

  // Initialize app
  const financeTracker = new FinanceTracker();
  financeTracker.init();
});

// FinanceTracker class
class FinanceTracker {
  constructor() {
    this.transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    this.categories = JSON.parse(localStorage.getItem("categories")) || [
      { id: 1, name: "Salary", type: "income" },
      { id: 2, name: "Freelance", type: "income" },
      { id: 3, name: "Investment", type: "income" },
      { id: 4, name: "Gift", type: "income" },
      { id: 5, name: "Food", type: "expense" },
      { id: 6, name: "Transportation", type: "expense" },
      { id: 7, name: "Entertainment", type: "expense" },
      { id: 8, name: "Utilities", type: "expense" },
      { id: 9, name: "Healthcare", type: "expense" },
    ];
    this.currency = localStorage.getItem("currency") || "USD";
    this.nextCategoryId = Math.max(...this.categories.map((c) => c.id), 0) + 1;
    this.nextTransactionId =
      Math.max(...this.transactions.map((t) => t.id), 0) + 1;
    this.chart = null;
  }

  init() {
    this.setCurrency(this.currency);
    this.renderCategories();
    this.renderTransactions();
    this.updateSummary();
    this.setupEventListeners();
    this.initChart();
  }

  // Format currency based on selected currency
  formatCurrency(amount) {
    const currencyInfo = CURRENCY_FORMATS[this.currency];
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currencyInfo.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Get currency symbol
  getCurrencySymbol() {
    return CURRENCY_FORMATS[this.currency].symbol;
  }

  // Set currency and update UI
  setCurrency(currencyCode) {
    this.currency = currencyCode;
    localStorage.setItem("currency", currencyCode);

    // Update currency selector
    document.getElementById("global-currency").value = currencyCode;
    document.getElementById("settings-currency").value = currencyCode;

    // Refresh UI elements that display currency
    this.updateSummary();
    this.renderTransactions();
  }

  // Save data to localStorage
  saveData() {
    localStorage.setItem("transactions", JSON.stringify(this.transactions));
    localStorage.setItem("categories", JSON.stringify(this.categories));
  }

  // Render categories in dropdowns
  renderCategories() {
    const categorySelect = document.getElementById("category");
    const filterCategorySelect = document.getElementById("filter-category");
    const incomeCategoriesContainer =
      document.getElementById("income-categories");
    const expenseCategoriesContainer =
      document.getElementById("expense-categories");

    // Clear existing options
    categorySelect.innerHTML = "";
    filterCategorySelect.innerHTML =
      '<option value="all">All Categories</option>';
    incomeCategoriesContainer.innerHTML = "";
    expenseCategoriesContainer.innerHTML = "";

    // Add categories to dropdowns
    this.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);

      const filterOption = document.createElement("option");
      filterOption.value = category.id;
      filterOption.textContent = category.name;
      filterCategorySelect.appendChild(filterOption);

      // Add to category management
      const categoryTag = document.createElement("div");
      categoryTag.className = "category-tag";
      categoryTag.innerHTML = `
                        ${category.name}
                        <button class="delete-category" data-id="${category.id}">×</button>
                    `;

      if (category.type === "income") {
        incomeCategoriesContainer.appendChild(categoryTag);
      } else {
        expenseCategoriesContainer.appendChild(categoryTag);
      }
    });

    // Add event listeners for delete category buttons
    document.querySelectorAll(".delete-category").forEach((button) => {
      button.addEventListener("click", (e) => {
        const categoryId = parseInt(e.target.dataset.id);
        this.deleteCategory(categoryId);
      });
    });
  }

  // Render transactions
  renderTransactions() {
    const transactionList = document.getElementById("transaction-list");
    const filteredTransactions = this.getFilteredTransactions();

    if (filteredTransactions.length === 0) {
      transactionList.innerHTML =
        '<div class="empty-state">No transactions found. Add your first transaction above.</div>';
      return;
    }

    transactionList.innerHTML = "";

    filteredTransactions.forEach((transaction) => {
      const category = this.categories.find(
        (c) => c.id === transaction.categoryId
      );
      const transactionItem = document.createElement("div");
      transactionItem.className = "transaction-item";
      transactionItem.innerHTML = `
                        <div class="transaction-details">
                            <div class="transaction-title">${
                              category ? category.name : "Unknown"
                            }</div>
                            <div class="transaction-date">${new Date(
                              transaction.date
                            ).toLocaleDateString()}</div>
                            <div class="transaction-notes">${
                              transaction.notes || ""
                            }</div>
                        </div>
                        <div class="transaction-amount ${transaction.type}">
                            ${
                              transaction.type === "income" ? "+" : "-"
                            }${this.formatCurrency(transaction.amount)}
                        </div>
                        <div class="transaction-actions">
                            <button class="delete-transaction" data-id="${
                              transaction.id
                            }">Delete</button>
                        </div>
                    `;
      transactionList.appendChild(transactionItem);
    });

    // Add event listeners for delete transaction buttons
    document.querySelectorAll(".delete-transaction").forEach((button) => {
      button.addEventListener("click", (e) => {
        const transactionId = parseInt(e.target.dataset.id);
        this.deleteTransaction(transactionId);
      });
    });
  }

  // Get filtered transactions based on current filters
  getFilteredTransactions() {
    const typeFilter = document.getElementById("filter-type").value;
    const categoryFilter = document.getElementById("filter-category").value;
    const startDateFilter = document.getElementById("filter-start-date").value;
    const endDateFilter = document.getElementById("filter-end-date").value;

    return this.transactions.filter((transaction) => {
      // Type filter
      if (typeFilter !== "all" && transaction.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (
        categoryFilter !== "all" &&
        transaction.categoryId !== parseInt(categoryFilter)
      ) {
        return false;
      }

      // Date range filter
      const transactionDate = new Date(transaction.date);
      if (startDateFilter && transactionDate < new Date(startDateFilter)) {
        return false;
      }
      if (endDateFilter && transactionDate > new Date(endDateFilter)) {
        return false;
      }

      return true;
    });
  }

  // Update summary cards
  updateSummary() {
    const totalIncome = this.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = this.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    document.getElementById("total-income").textContent =
      this.formatCurrency(totalIncome);
    document.getElementById("total-expenses").textContent =
      this.formatCurrency(totalExpenses);
    document.getElementById("balance").textContent =
      this.formatCurrency(balance);

    // Update balance color
    const balanceElement = document.getElementById("balance");
    balanceElement.className = "amount";
    if (balance > 0) {
      balanceElement.classList.add("income");
    } else if (balance < 0) {
      balanceElement.classList.add("expense");
    }

    // Update chart if it exists
    if (this.chart) {
      this.updateChart();
    }
  }

  // Add a new transaction
  addTransaction(type, amount, date, categoryId, notes) {
    const transaction = {
      id: this.nextTransactionId++,
      type,
      amount: parseFloat(amount),
      date,
      categoryId: parseInt(categoryId),
      notes,
    };

    this.transactions.push(transaction);
    this.saveData();
    this.renderTransactions();
    this.updateSummary();
  }

  // Delete a transaction
  deleteTransaction(id) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.saveData();
    this.renderTransactions();
    this.updateSummary();
  }

  // Add a new category
  addCategory(name, type) {
    const category = {
      id: this.nextCategoryId++,
      name,
      type,
    };

    this.categories.push(category);
    this.saveData();
    this.renderCategories();
  }

  // Delete a category
  deleteCategory(id) {
    // Check if category is used in any transactions
    const isUsed = this.transactions.some((t) => t.categoryId === id);

    if (isUsed) {
      alert(
        "Cannot delete category that is used in transactions. Please reassign or delete those transactions first."
      );
      return;
    }

    this.categories = this.categories.filter((c) => c.id !== id);
    this.saveData();
    this.renderCategories();
  }

  // Initialize the chart
  initChart() {
    const ctx = document.getElementById("finance-chart").getContext("2d");
    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Income",
            backgroundColor: "#28a745",
            data: [],
          },
          {
            label: "Expenses",
            backgroundColor: "#dc3545",
            data: [],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value),
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${this.formatCurrency(
                  context.raw
                )}`;
              },
            },
          },
        },
      },
    });

    this.updateChart();
  }

  // Update the chart with current data
  updateChart() {
    if (!this.chart) return;

    // Group transactions by month
    const monthlyData = {};

    this.transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { income: 0, expense: 0 };
      }

      if (transaction.type === "income") {
        monthlyData[monthYear].income += transaction.amount;
      } else {
        monthlyData[monthYear].expense += transaction.amount;
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort();

    // Format month labels
    const labels = sortedMonths.map((month) => {
      const [year, monthNum] = month.split("-");
      return new Date(year, monthNum - 1).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    });

    // Extract income and expense data
    const incomeData = sortedMonths.map((month) => monthlyData[month].income);
    const expenseData = sortedMonths.map((month) => monthlyData[month].expense);

    // Update chart
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = incomeData;
    this.chart.data.datasets[1].data = expenseData;
    this.chart.update();
  }

  // Export transactions to CSV
  exportToCSV() {
    if (this.transactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    // Create CSV header
    let csv = "Type,Amount,Currency,Date,Category,Notes\n";

    // Add transaction data
    this.transactions.forEach((transaction) => {
      const category = this.categories.find(
        (c) => c.id === transaction.categoryId
      );
      const categoryName = category ? category.name : "Unknown";

      csv += `"${transaction.type}","${transaction.amount}","${
        this.currency
      }","${transaction.date}","${categoryName}","${
        transaction.notes || ""
      }"\n`;
    });

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-transactions-${this.currency}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all data
  clearAllData() {
    if (
      confirm(
        "Are you sure you want to delete ALL data? This action cannot be undone."
      )
    ) {
      this.transactions = [];
      this.categories = [
        { id: 1, name: "Salary", type: "income" },
        { id: 2, name: "Freelance", type: "income" },
        { id: 3, name: "Investment", type: "income" },
        { id: 4, name: "Gift", type: "income" },
        { id: 5, name: "Food", type: "expense" },
        { id: 6, name: "Transportation", type: "expense" },
        { id: 7, name: "Entertainment", type: "expense" },
        { id: 8, name: "Utilities", type: "expense" },
        { id: 9, name: "Healthcare", type: "expense" },
      ];
      this.nextCategoryId = 10;
      this.nextTransactionId = 1;

      this.saveData();
      this.renderCategories();
      this.renderTransactions();
      this.updateSummary();
      this.updateChart();

      alert(
        "All data has been cleared. Default categories have been restored."
      );
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Transaction form submission
    document
      .getElementById("transaction-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();

        const type = document.getElementById("type").value;
        const amount = document.getElementById("amount").value;
        const date = document.getElementById("date").value;
        const categoryId = document.getElementById("category").value;
        const notes = document.getElementById("notes").value;

        if (!amount || !date || !categoryId) {
          alert("Please fill in all required fields.");
          return;
        }

        this.addTransaction(type, amount, date, categoryId, notes);

        // Reset form
        document.getElementById("transaction-form").reset();
        document.getElementById("date").valueAsDate = new Date();
      });

    // Add category
    document.getElementById("add-category").addEventListener("click", () => {
      const name = document.getElementById("new-category-name").value.trim();
      const type = document.getElementById("new-category-type").value;

      if (!name) {
        alert("Please enter a category name.");
        return;
      }

      // Check if category already exists
      if (
        this.categories.some(
          (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type
        )
      ) {
        alert("Category with this name and type already exists.");
        return;
      }

      this.addCategory(name, type);

      // Reset form
      document.getElementById("new-category-name").value = "";
    });

    // Filter events
    document.getElementById("filter-type").addEventListener("change", () => {
      this.renderTransactions();
    });

    document
      .getElementById("filter-category")
      .addEventListener("change", () => {
        this.renderTransactions();
      });

    document
      .getElementById("filter-start-date")
      .addEventListener("change", () => {
        this.renderTransactions();
      });

    document
      .getElementById("filter-end-date")
      .addEventListener("change", () => {
        this.renderTransactions();
      });

    document.getElementById("clear-filters").addEventListener("click", () => {
      document.getElementById("filter-type").value = "all";
      document.getElementById("filter-category").value = "all";
      document.getElementById("filter-start-date").value = "";
      document.getElementById("filter-end-date").value = "";
      this.renderTransactions();
    });

    // Tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs and content
        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));

        // Add active class to clicked tab and corresponding content
        tab.classList.add("active");
        document
          .getElementById(`${tab.dataset.tab}-tab`)
          .classList.add("active");

        // Update chart when switching to analytics tab
        if (tab.dataset.tab === "analytics") {
          this.updateChart();
        }
      });
    });

    // CSV export
    document.getElementById("export-csv").addEventListener("click", () => {
      this.exportToCSV();
    });

    // Currency change
    document
      .getElementById("global-currency")
      .addEventListener("change", (e) => {
        this.setCurrency(e.target.value);
      });

    // Settings currency change
    document
      .getElementById("settings-currency")
      .addEventListener("change", (e) => {
        this.setCurrency(e.target.value);
      });

    // Clear all data
    document.getElementById("clear-all-data").addEventListener("click", () => {
      this.clearAllData();
    });
  }
}
