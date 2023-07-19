//--------------------------------------------------------------------------------packages----------------------------------------------------------------------
const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { error } = require('console');
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: 'khalnaiqhunmein',
  resave: false,
  saveUninitialized: true,
}));
app.set('view engine', 'ejs');
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mere125meinpetrolkesedalwaunga",
    database: 'inventory_management_system',
  });
  
  // --------------------------------------------------------------------main route default route login-------------------------------------------------------------------------
  app.get('/', async (req,res)=>{
    res.sendFile(path.join(__dirname,'super_admin.html'));
  });
//-------------------------------------------------------------------------------function to assign order_id-------------------------------------------------------------
const fs = require('fs');
function assignOrderToUser( callback) {
  const filePath = 'order_id.txt';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading order ID file:', err);
    } else {
     
      let currentOrderId = parseInt(data);
      currentOrderId++;
      console.log(`${newUserName} has been assigned order ID: ${currentOrderId}`);

      fs.writeFile(filePath, currentOrderId.toString(), 'utf8', (err) => {
        if (err) {
          console.error('Error writing order ID to file:', err);
        } else {
          console.log('Order ID has been updated and saved to file.');
         
          callback(currentOrderId);
        }
      });
    }
  });
}

  //--------------------------------------API that will be hit when user logs in either as cashier, stock manager, or quality assurance from first page-------------------------
 app.post('/login',async (req,res)=>{
    const selected_tab = req.body.tabs;
    const {username, password} = req.body;
    const values = [username];

    let query;
    let link;
  if (selected_tab == "cashier"){
      query = "SELECT * FROM cashier WHERE username=?";
      link = '/cashier';
      authQuery(query,link,'cashier_user');
  }
  else if (selected_tab == "qa"){
      query = "SELECT * FROM quality_assurance WHERE username=?";
      link = '/qa';
      authQuery(query,link,'qa_user');
  }
  else if (selected_tab == "stock_manager"){
    query = "SELECT * FROM stock_manager WHERE username=?";
    link = '/stock_manager';
    authQuery(query,link,'stock_user');
  }
  else{
    return res.redirect('/');
  }

  function authQuery(query,link,user_type){
  connection.query(query, values, (error, results)=>{
    if (error) {
      console.error('Error executing query:', error);
      return res.redirect('/');
    } 
    else if (results.length === 0) {
      console.log(results);
      console.log("invalid username or password");
      return res.redirect('/');
    }
    else if (bcrypt.compareSync(password, results[0].password)){
        req.session[user_type] = username;
        return res.redirect(link);
    }
    else{
      console.log("Invalid password");
      return res.redirect('/');
    }
  })};
  });
  
//-----------------------------------------------------------------------------------portal for qa---------------------------------------------------------------------
  app.get('/qa',async (req,res)=>{
    let branch_id;
    let query;
    if (req.session['qa_user']){
      const username = req.session['qa_user'];
      const branch_query = "SELECT branch_id FROM quality_assurance WHERE username = ?";
      connection.query(branch_query, [username], (error,results)=>{
        branch_id = results[0].branch_id;
    
      if (branch_id == '001'){
        query = "SELECT * FROM pending";
        execQuery(query);
      }
      else if (branch_id == '002'){
        query = "SELECT * FROM pending_isb";
        execQuery(query);
      }
      else if (branch_id == '003'){
        query = "SELECT * FROM pending_lhr";
        execQuery(query);
      }
      else {
        console.log("Invalid branch");
        console.log(branch_id);
        return res.redirect('/');
      }});

      function execQuery(query){
      connection.query(query, (error, results)=>{
        if (error){
          console.log({"message":error});
          return res.redirect('/');
        }
        else {
          res.render('QA',{data: results})
        }
      });}
    }else{
      return res.redirect('/');
    }
  });
//-------------------------------------------------------------------------portal for stock manager--------------------------------------------------------------------------------------------
  app.get('/stock_manager', async (req,res)=>{
    if (req.session['stock_user']){
      return res.sendFile(path.join(__dirname,'main.html'));
    }
    else{
      return res.redirect('/');
    }
  })

//------------------------------------------------------------------add to stock page -------------------------------------------------------------------------------------------------

  app.get('/add-stock', async (req,res)=>{
    if (req.session['stock_user'])
      res.sendFile(path.join(__dirname,'add-stock.html'));
  });
//---------------------------------------------------------------------remove from stock page----------------------------------------------------------------
  app.get('/remove-stock',async (req,res)=>{

      res.sendFile(path.join(__dirname,'remove-stock.html'));
  });

  app.get('/damage-stock', async(req,res)=>{
    if (req.session['stock_user']){
      viewQuery = "SELECT * FROM damaged_stock";
      connection.query(viewQuery, (error,results)=>{
        if (error){
          console.log(error);
          return res.redirect('/');
        }else
        {
          return res.render('damage-stock',{data: results});
        }
      })
    }else{
      return res.redirect('/');
    }
  })

//------------------------------------------------------------------add to stock post route ------------------------------------------------------------------------------------------------
  app.post('/add-stock', async(req,res)=>{
    let branchId;
    if (req.session['stock_user']){
    const {BRANCH_NAME, stockId,ntn,productId,supplyDate,purchasing_price,expiry,suppliedUnits} = req.body;
    console.log(BRANCH_NAME);
    const branch_query = "INSERT INTO stock VALUES(?,?,?,?,?,?,?,?,?,?)";
    if (BRANCH_NAME == "khi"){branchId='001';}
    else if (BRANCH_NAME == "isb"){branchId='002';}
    else if (BRANCH_NAME == "lhr"){branchId='003';}
    else {return res.redirect('/add-stock');}
    values = [stockId, ntn, productId, purchasing_price, suppliedUnits, expiry, supplyDate, 0, suppliedUnits, branchId];
    connection.query(branch_query, values, (error, results)=>{
      if (error){
        console.log(error);
        return res.redirect('/add-stock');
      }
      console.log({"message":"Successfully inserted"});
      return res.redirect('/add-stock');
    });}
    else{
      return res.redirect('/');
    }
  });
//------------------------------------------------------------------remove from stock post route --------------------------------------------------------------------------------------
app.post('/remove-stock', async(req,res)=>{
  const {BRANCH_NAME, unitsToRemove, productId} = req.body;
  unitsToRemove = parseInt(unitsToRemove);
  let branchId;
  if (BRANCH_NAME == "khi"){
    branchId = '001';
  }
  else if(BRANCH_NAME = "isb"){
    branchId = '002';
  }
  else if(BRANCH_NAME == "lhr"){
    branchId = '003';
  }
  else{
    console.log("Invalid branch");
    res.redirect('/stock_manager');
  }
  const query = "UPDATE kept SET Units = Units - ? WHERE Branch_id = ? AND Product_id = ?";
  connection.query(query, [unitsToRemove, branchId, productId], (error, results)=>{
    if (error){
      console.log(error);
      return res.redirect('/remove-stock');
    }else{
      console.log("Removed successfully");
      return res.redirect('/remove-stock');
    }
  });

});


//-----------------------------------------------------submit to qa -----------------------------------------------------------------------------------
app.post('/submit-qa',async(req,res)=>{
  let {damagedUnits, stockId} = req.body;
  stockId = parseInt(stockId);
  damagedUnits = parseInt(damagedUnits);
  const selectStockQuery = "SELECT Branch_id, Product_id, Supplied_units from stock WHERE Stock_id=?";
  const insertKeptQuery = "INSERT INTO kept VALUES(?,?,?)";
  const checkDuplicateQuery = "SELECT COUNT(*) as count FROM kept WHERE Branch_id =? AND Product_id = ?";
  const updateKeptQuery = "UPDATE kept SET Units = Units + ? WHERE Branch_id = ? AND Product_id = ?";
  const values = [stockId, damagedUnits];
  if (damagedUnits == 0){
      connection.query(selectStockQuery, [stockId], (error,results)=>{
        if (error) {
          console.error('Error occurred while retrieving data from stock:', error);
          return;
        }
  
        if (results.length === 0) {
          console.log('No stock found for the given stock ID');
          return;
        }
  
        const { branch_id, product_id, supplied_units } = results[0];
      connection.query(checkDuplicateQuery, [branch_id, product_id],(error,results)=>
        { if (results[0].count == 0){
          connection.query(insertKeptQuery, [branch_id, product_id, supplied_units], (error,results)=>{
          if (error) {
            console.error('Error occurred while inserting data into kept:', error);
          } else {
            console.log('Data inserted into kept successfully');
            updateStock(stockId);
          }
        })}
        else{
          connection.query(updateKeptQuery, [branch_id, product_id], (error, results)=>{
            if (error){
              console.log(error);
              return res.redirect('/add-stock');
            }else{
              console.log("Updated successfully");
              updateStock(stockId);
              return res.redirect('/add-stock');
            }
          })
        }
      });
      });
  }
  else{
  connection.query("INSERT INTO damaged(Stock_id, units_damaged) VALUES(?, ?)", values,(error,results)=>{
    if (error){
      if (error.code === 'ER_SIGNAL_EXCEPTION'){
        console.log('Damaged units exceed supplied units');
      }else{
        console.error('Error occurred during insert:', error);
      }
    }else{
      console.log("Damaged units inserted successfully");    
      updateStock(stockId);
    }
  });}

  function updateStock(stockId){
    const updateStockQuery = "UPDATE stock SET Decided_units = Supplied_units, Pending_units = 0 WHERE Stock_id =?";
    connection.query(updateStockQuery, [stockId], (error,results)=>{
      if (error){
        console.error('Error occurred', error);
      }else{
        console.log("Stock updated successfully");
      }
    });
  }
});
//---------------------------------------------------------------------------- cashier portal----------------------------------------------------------------------------
app.get('/cashier', async (req,res)=>{
  const sqlQuery = 'SELECT Product_id, Name, Sell_price FROM product';
  connection.query(sqlQuery, (err, results) => {
  if (err) {
    console.error('Error executing the query: ', err);
    return;
  }
 const productsList = results.map((product) => ({
   Product_id: product.Product_id,
   Name: product.Name,
   Sell_price: product.Sell_price,
 }));

if (req.session['cashier_user']){
 res.render('cashier', {
   productsList,
   cashier_id: req.session['cashier_user']
 });}else{
  return res.redirect('/');
 }
// res.render('cashier', { productsList });

});

});
//----------------------------------------------------------------when placeorder is clicked---------------------------------------------------------------------------------------
app.post('/placeorder', (req, res) => {
  const orderDataToSend = req.body;
  const insertOrderProductQuery = `
    INSERT INTO order_product (order_id, product_id, units, price_of_single_unit)
    VALUES (?, ?, ?, ?)
  `;
  const getProductSellPriceQuery = 'SELECT Sell_price FROM product WHERE Product_id = ?';
  
  // Function to handle each product in the order
  const handleProduct = (product, callback) => {
  //const { product_id, quantity, branch } = product;
    const product_id = product.Product_id;
    
    const quantity = product.Quantity;
    const branch = req.session.branchId;//session se uthe gi

    
    
    
    const selectKeptQuery = `
      SELECT Units FROM kept
      WHERE Branch_id = ? AND Product_id = ?
    `;

    // Check if the product is associated with any offer
    const selectOfferQuery = `
      SELECT Percentage FROM offer
      WHERE Category = (
        SELECT Category FROM product
        WHERE Product_id = ?
      ) AND Expiry >= NOW()
      LIMIT 1
      

    `;

    connection.beginTransaction((err) => {
      if (err) {
        callback(err);
        return;
      }

      connection.query(selectKeptQuery, [branch, product_id], (err, keptRows) => {
        if (err) {
          return connection.rollback(() => callback(err));
        }

        if (keptRows.length === 0 || keptRows[0].Units < quantity) {
          return connection.rollback(() => callback(new Error('Insufficient units in the branch')));
        }

        const updatedUnits = keptRows[0].Units - quantity;
         const updateKeptQuery = `
        UPDATE kept
        SET Units = ?
        WHERE Branch_id = ? AND Product_id = ?
      `;

        connection.query(updateKeptQuery, [updatedUnits, branch, product_id], (err) => {
          if (err) {
            return connection.rollback(() => callback(err));
          }
          connection.query(selectOfferQuery, [product_id], (err, offerRows) => {
            if (err) {
              return connection.rollback(() => callback(err));
            }
            connection.query(getProductSellPriceQuery, [product_id], (err, results) => {
              if (err) {
                console.error('Error executing the query:', err.message);
                return;
              }
              if (results.length === 0) {
                console.error('Product not found');
                return;
              }
            const product_Sell_price = results[0].Sell_price;
            let price_of_single_unit;
            if (offerRows.length > 0) {
              const discountPercentage = offerRows[0].Percentage;
              price_of_single_unit = product_Sell_price * (1 - discountPercentage / 100);
            } else {
              price_of_single_unit = product_Sell_price;
              
            }

            connection.query(
              insertOrderProductQuery,
              [order_id, product_id, quantity, price_of_single_unit],
              (err) => {
                if (err) {
                  return connection.rollback(() => callback(err));
                }

                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => callback(err));
                  }

                  callback(null);
                });
              }
            );
          });
        });
      });
    });
  });
  };
  


  assignOrderToUser( (updatedOrderId) => {
    const order_id = updatedOrderId;
    console.log('Assigned order ID:', order_id);
    });
//const order_id = '59'; 
connection.beginTransaction((err) => {
    if (err) {
      res.send(" ia m here");
      return res.status(500).json({ error: 'Error processing the order' });
    }

    // Loop through the order data and handle each product
    const handleProductPromises = orderDataToSend.map((product) => {
      return new Promise((resolve, reject) => {
        handleProduct(product, (err) => {
          if (err) {
            res.send(" ia m here");
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    Promise.all(handleProductPromises)
      .then(() => {
        // All products processed successfully, commit the transaction
        connection.commit((err) => {
          if (err) {
            console.log("hehhe")
            res.send(" ia m here");
            return res.status(500).json({ error: 'Error processing the order' });
            
          }

          return res.json({ message: 'Order submitted successfully' });
        });
      })
      .catch((err) => {
        connection.rollback(() => {
          console.log("error processing the order");
         // return res.status(500).json({ error: 'Error processing the order' });
        });
      });
  });
});

//---------------------------------------------------------------------to display karachi data---------------------------------------------------- 
app.get('/Karachi',async(req,res)=>{
  if (req.session['stock_user']){
      const query = "SELECT * FROM karachi";
      connection.query(query, (error,values)=>{
        if (error){
          console.log(error);
          res.redirect('/stock_manager');
        }else{
          res.render('tableB1',{data: results})
        }
      });
  }else{
    return res.redirect('/');
  }
});
//-------------------------------------------------------------------------------to display lahore data------------------------------------------------------ 
app.get('/Lahore',async(req,res)=>{
  if (req.session['stock_user']){
    const query = "SELECT * FROM lahore";
    connection.query(query, (error,values)=>{
      if (error){
        console.log(error);
        res.redirect('/stock_manager');
      }else{
        res.render('tableB2',{data: results})
      }
    })
  }else{
    return res.redirect('/');
  }
});
//---------------------------------------------------------------------to display islamabad data-------------------------------------------------------- 
app.get('/Islamabad',async(req,res)=>{
  if (req.session['stock_user']){
    const query = "SELECT * FROM islamabad";
    connection.query(query, (error,values)=>{
      if (error){
        console.log(error);
        res.redirect('/stock_manager');
      }else{
        res.render('tableB3',{data: results})
      }
    })
  }else{
    return res.redirect('/');
  }
});
//-----------------------------------------------to display pie chart--------------------------------------------------
//--------------------------ye route call  nhi hrha ye piechart render hgi to khud chl jai ga------------------------
app.get('/piechartdata', (req, res) => {
  const query = `
    SELECT p.Category, COUNT(op.units) AS total_units
    FROM order_product op
    INNER JOIN product p ON op.product_id = p.Product_id
    GROUP BY p.Category
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching data from the database' });
    }

    // Process the data for the pie chart
    const pieChartData = results.map((row) => ({
      category: row.Category,
      total_units: row.total_units
    }));

    res.json(pieChartData);
  });
});





//------------------------------------------------------------------------------ GET route to render the EJS file-------------------------------------------------------------------------------------------------------------
app.get('/employees', (req, res) => {

  const fetchWarehouseData = `SELECT * FROM quality_assurance`;

  // Execute the query
  connection.query(fetchWarehouseData, (error, warehouseData) => {
    if (error) {
      console.error('Error fetching warehouse data:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    
    res.render('employees', {
      selectedTab: 'cashier',
      employees: warehouseData,
    });
  });
});

//---------------------------------------------------- Define the GET route to handle AJAX requests for different tabs in employee data display --------------------------------------------------------------
app.get('/employees/:tab', (req, res) => {
  const { tab } = req.params;
  let query = '';

  switch (tab) {
    case 'quality_assurance':
      query = `SELECT * FROM quality_assurance`;
      break;
    case 'stock_manager':
      query = `SELECT * FROM emp_stock_manager`;
      break;
    case 'cashier':
      query = `SELECT * FROM cashier`;
      break;
    default:
      return res.status(404).send('Invalid tab');
  }

  // Execute the query
  connection.query(query, (error, data) => {
    if (error) {
      console.error(`Error fetching ${tab} data:`, error);
      res.status(500).send('Internal Server Error');
    } else {
      res.json(data);
    }
  });
});














//-----------------------------------------------------update  employee(sm,qa,cashier)-------------------------------------------------------------------------------------
app.post('/updateemployee', (req, res) => {
  const selectedTab = req.body.selectedTab;
  if (selectedTab=="cashier"){
    //const { employee_id, field, new_value } = req.body;
    const employee_id = req.body.employee_id;
    const field = "salary";
     const new_value = req.body.new_value;

  const sqlQuery = 'UPDATE cashier SET ?? = ? cashier = ?';
  const params = [field, new_value, employee_id];
  connection.query(sqlQuery, params, (err, results) => {
    if (err) {
      console.error('Error updating employee data:', err);
      return res.status(500).json({ error: 'Error updating employee data' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json({ message: 'Employee data updated successfully' });
  });

  }
  else if(selectedTab=="stock_manager"){
    //const { id_emp_stock_manager, field, new_value } = req.body;
    const id_emp_stock_manager = req.body.employee_id;
    const field = "salary";
     const new_value = req.body.new_value;


    const sqlQuery = `UPDATE stock_manager SET ${field} = ? WHERE stock_manager = ?`;
    const values = [new_value, id_emp_stock_manager];
  

    connection.query(sqlQuery, values, (err, results) => {
      if (err) {
        console.error('Error updating Stock Manager data:', err);
        return res.status(500).json({ error: 'Error updating Stock Manager data' });
      }
  
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Stock Manager not found' });
      }
  
      return res.status(200).json({ message: 'Stock Manager data updated successfully' });
    });

  }
  else if(selectedTab=="quality_assurance"){
   // const { id_emp_quality_assurance, field, new_value } = req.body;
    const id_emp_quality_assurance = req.body.employee_id;
    const field = "salary";
     const new_value = req.body.new_value;
     const sqlQuery = `UPDATE quality_assurance SET ${field} = ? username = ?`;
     const values = [new_value, id_emp_quality_assurance];
     connection.query(sqlQuery, values, (err, results) => {
     if (err) {
       console.error('Error updating Quality Assurance employee data:', err);
       return res.status(500).json({ error: 'Error updating Quality Assurance employee data' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Quality Assurance employee not found' });
    }

    return res.status(200).json({ message: 'Quality Assurance employee data updated successfully' });
  });

  }
  else{
    res.redirect('/employees');

  }
  
});






//-----------------------------------------------------add employee(sm,qa,cashier)-------------------------------------------------------------------------------------
app.post('/addemployee', (req, res) => {
  console.log(" i am here");
  const selectedTab = req.body.selectedTab;
  console.log(selectedTab);
  if(selectedTab=="cashier"){
    console.log("i am here")
    const { name, address, username, password, branch, salary } = req.body;
    const newEmployee = {
      name: name,
      address: address,
      username: username,
      password: password,
      branch: branch,
      salary: salary,
    }
    const sqlQuery = 'INSERT INTO emp_cashier SET ?';
    connection.query(sqlQuery, newEmployee, (err, results) => {
      if (err) {
        console.error('Error adding employee:', err);
        return res.status(500).json({ error: 'Error adding employee' });
      }
      const insertedEmployeeId = results.insertId;
      return res.status(200).json({ cashier: insertedEmployeeId });
    });
    
  }
  else if(selectedTab=="stock_manager"){
    const { name, address, username, password, salary } = req.body;

  
  const sqlQuery = 'INSERT INTO stock_manager (name, address, username, password, salary) VALUES (?, ?, ?, ?, ?)';
  const values = [name, address, username, password, salary];

  
  connection.query(sqlQuery, values, (err, results) => {
    if (err) {
      console.error('Error adding Stock Manager:', err);
      return res.status(500).json({ error: 'Error adding Stock Manager' });
    }


    const insertedEmployeeId = results.insertId;
    return res.status(200).json({ stock_manager: insertedEmployeeId });
  });
  }
  else if (selectedTab=="quality_assurance"){
    const { name, address, username, password, salary } = req.body;
  const sqlQuery = 'INSERT INTO quality_assurance (name, address, username, password, salary) VALUES (?, ?, ?, ?, ?)';
  const values = [name, address, username, password, salary];

  
  connection.query(sqlQuery, values, (err, results) => {
    if (err) {
      console.error('Error adding Quality Assurance employee:', err);
      return res.status(500).json({ error: 'Error adding Quality Assurance employee' });
    }
    const insertedEmployeeId = results.insertId;
    return res.status(200).json({ quality_assurance: insertedEmployeeId });
  });

  }
  else{
    res.redirect('/employees');
  }
 
});







//-------------------------------------------------------pie chart jab render hgi to is se data fetch kre gi-----------------------------------------------------------------------

app.get('/piechartdata', (req, res) => {
  const query = `
    SELECT p.Category, COUNT(op.units) AS total_units
    FROM order_product op
    INNER JOIN product p ON op.product_id = p.Product_id
    GROUP BY p.Category
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching data from the database' });
    }

    // Process the data for the pie chart
    const pieChartData = results.map((row) => ({
      category: row.Category,
      total_units: row.total_units
    }));

    res.json(pieChartData);
  });
});

app.get('/update-price',async(req,res)=>{
  return res.send(path.join(__dirname,'update-product.html'))
})
app.post('/update-price',async (req,res)=>{
  const query = "UPDATE product SET Sell_price = ? WHERE Product_id =?";
  const {productId,sellingPrice} = req.body;
  connection.query(query,[productId,sellingPrice],(error,results)=>{
    if (error){
      console.log(error);
    }else{
      console.log("Updated price successfully");
    }
  })
})

app.get('/offers',async (req,res)=>{
  const query = "SELECT * FROM show_categories";
  connection.query(query, (error,results)=>{
    if (error){
      console.log(error);
      return res.redirect('/');
    }else{
      return res.render('offers',{options: results});
    }
  })
});

app.post('/offers',async (req,res)=>{
  const {category, dispercent, expiry} = req.body;
  dispercent = parseFloat(dispercent);
  const query = "INSERT INTO offers VALUES(?,?,?)";
  connection.query(query, [category,expiry,dispercent], (error, results)=>{
    if (error){
      if (error.code === 'ER_SIGNAL_EXCEPTION') {
        console.log("Category alread there");
        return res.redirect('/offers');
      }
      console.log(error);
      return res.redirect('/offers')
    }else{
      console.log("Inserted successfully");
      return res.redirect('/offers');
    }
  })
});








//--------------------------------------------------------------------server to listen on-----------------------------------------------------------------------------
app.listen(3000, () => {
  console.log("Server is running on 3000");

});