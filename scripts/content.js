async function checkSession() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let sessionExpiry = await StorageManager.readLocalStorage("sessionExpiry");
    if (sessionKey === undefined || sessionExpiry < Date.now() / 1000) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

class Content {
  constructor(plu) {
    this.stockCount = null;
    this.loginForm = null;
    this.container = null;
    this.stockInfo = null;
    this.plu = plu;

    this.createMainContainer();
 }

  async createMainContainer() {
    // Create the container block
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.right = "0";
    this.container.style.top = "300px";
    this.container.style.backgroundColor = "#fff";
    this.container.style.padding = "10px";
    this.container.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.25)";
    this.container.style.zIndex = "1000";
    this.container.style.width = "250px";
    // Add the container block to the body
    document.body.appendChild(this.container);

    const warehouseses = [{id: '5000000135', name: 'DFO Brisbane'}, {id: '5000000136', name: ' - Held Stock'}, {id: '5000000089', name: 'Carindale'}, {id: '5000000039', name: 'Chermside'}, {id: '5000000113', name: 'Myer Centre Brisbane'}];
    this.stockCount = new StockCount(this.container, warehouseses);
    this.loginForm = new LoginForm(this.container, this.logInSuccess.bind(this));

    const sessionValid = await checkSession();

    if (sessionValid) {
      this.logInSuccess();
    } else {
      this.loginForm.show();
    }
  }

  async logInSuccess() {
    this.stockCount.show();
    this.loginForm.hide();
    await this.fetchStockInfo(this.plu);
    console.log("Stock info: ", this.stockInfo);
    this.stockCount.updateStockCount(this.stockInfo);

  }

  async fetchStockInfo(plu) {
    if (!(await checkSession())) {
      console.log("Invalid session key");
      return;
    }
  
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "getStockCount", plus: plu },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            this.stockInfo = response;
            console.log("Stock info: ", response);
            resolve(response);
          }
        }
      );
    });
  }

}

class LoginForm {
  constructor(container, logInSuccess) {
    this.container = container;
    this.logInSuccess = logInSuccess;
    this.form = this.createLoginForm();
  }

  createLoginForm() {
    // Create the login form
    const loginForm = document.createElement("form");
    loginForm.style.padding = "20px";
    this.container.appendChild(loginForm);

    // Create the username field
    this.usernameField = document.createElement("input");
    this.usernameField.type = "text";
    this.usernameField.name = "username";
    this.usernameField.placeholder = "Username";
    loginForm.appendChild(this.usernameField);

    // Create the password field
    this.passwordField = document.createElement("input");
    this.passwordField.type = "password";
    this.passwordField.name = "password";
    this.passwordField.placeholder = "Password";
    loginForm.appendChild(this.passwordField);

    // Create the submit button
    const submitButton = document.createElement("input");
    submitButton.type = "submit";
    submitButton.value = "Log in";
    loginForm.appendChild(submitButton);

    // Handle form submission
    loginForm.addEventListener("submit", this.handleSubmit.bind(this));

    return loginForm;
  }

  handleSubmit(event) {
    event.preventDefault();
    // Handle login here
    chrome.runtime.sendMessage(
      {
        type: "getSessionKey",
        username: this.usernameField.value,
        password: this.passwordField.value,
      },
      (response) => {
        if (response.success) {
          console.log("Login successful");
          this.logInSuccess();
        } else {
          console.log("Login failed");
          alert("Login failed");
        }
      }
    );
  }

  show() {
    this.form.style.display = "block";
  }

  hide() {
    this.form.style.display = "none";
  }

}



class StockCount {
  constructor(container, warehouses) {
    this.container = container;
    this.warehouses = warehouses; // now an array of warehouse objects
    this.countForText = null;
    this.stockCounts = null;
    this.createStockCountElements();
  }

  createStockCountElements() {
    // Create the "Count for:" text
    this.countForText = document.createElement("p");
    this.countForText.textContent = "Count for:";
    this.countForText.style.fontSize = "2.5em";
    this.countForText.style.display = "none"; // hide initially
    this.container.appendChild(this.countForText);

    // Create a stock count element for each warehouse
    this.stockCounts = this.warehouses.map((warehouse) => {
      const stockCount = document.createElement("p");
      
      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${warehouse.name}: `;
      stockCount.appendChild(nameSpan);
    
      const countSpan = document.createElement("span");
      countSpan.textContent = "?"; // update this value later
      countSpan.style.fontWeight = 'bold'; // make the count bold
      countSpan.style.float = 'right'; // align the count to the right
      stockCount.appendChild(countSpan);
    
      stockCount.style.display = "none"; // hide initially
      this.container.appendChild(stockCount);
      return { p: stockCount, countSpan };
    });
  }

  updateStockCount(stockInfo) {
    this.stockCounts.forEach((stockCount, index) => {
      const warehouse = this.warehouses[index];
      stockCount.countSpan.textContent = `${stockInfo[warehouse.id]}`;
    });
  }
  
  show() {
    this.countForText.style.display = "block";
    this.stockCounts.forEach((stockCount) => {
      stockCount.p.style.display = "block";
    });
  }

  hide() {
    this.countForText.style.display = "none";
    this.stockCounts.forEach((stockCount) => {
      stockCount.p.style.display = "none";
    });
  }
}

// async function showPopup() {
//   const popup = document.createElement("div");
//   popup.style.position = "fixed";
//   popup.style.left = "50%";
//   popup.style.top = "50%";
//   popup.style.transform = "translate(-50%, -50%)";
//   popup.style.backgroundColor = "#eee";
//   popup.style.padding = "20px";
//   popup.style.zIndex = "1001";
//   popup.style.maxHeight = "400px"; // Set a maximum height
//   popup.style.overflowY = "auto"; // Enable vertical scrolling

//   const warehouseSelectText = document.createElement("p");
//   warehouseSelectText.textContent = "Select a warehouse:";
//   warehouseSelectText.style.marginBottom = "10px";
//   warehouseSelectText.appendChild(popup);

//   chrome.runtime.sendMessage({ type: "getWareHouses" }, (warehouses) => {
//     console.log(warehouses);
//     const list = document.createElement("ul");
//     warehouses.forEach((warehouse) => {
//       const listItem = document.createElement("li");
//       listItem.textContent = warehouse.name;
//       listItem.addEventListener("click", () => selectWarehouse(warehouse));
//       list.appendChild(listItem);
//     });
//     popup.appendChild(list);
//   });

//   document.body.appendChild(popup);
// }

// // Add this function to handle warehouse selection
// function selectWarehouse(warehouse) {
//   chrome.storage.local.set({ warehouse: warehouse }, function () {
//     console.log(
//       "Warehouse selected: " + warehouse.name + " (" + warehouse.id + ")"
//     );
//   });
// }

function getCurrentPluFromUrl() {
  var plu = /[0-9]{6}/.exec(window.location.href);
  console.log("plu: " + plu);
  return plu;
}

function checkURLforPlu() {
  return /[0-9]{6}/.test(window.location.href);
}

if (checkURLforPlu()) {
  new Content(getCurrentPluFromUrl());
}
