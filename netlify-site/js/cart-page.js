let cart = JSON.parse(localStorage.getItem("cart")) || [];

const container = document.getElementById("cart-items");

let subtotal = 0;

function displayCart(){

container.innerHTML="";

subtotal=0;

cart.forEach((item,index)=>{

subtotal += item.price * item.quantity;

container.innerHTML +=`

<div class="cart-item">

<img src="${item.image}" width="120">

<div>

<h2>${item.name}</h2>

<h3>₹${item.price}</h3>

<div class="qty">

<button onclick="decrease(${index})">-</button>

<span>${item.quantity}</span>

<button onclick="increase(${index})">+</button>

</div>

</div>

<button onclick="removeItem(${index})">

Remove

</button>

</div>

`;

});

updateSummary();

}

function increase(index){

cart[index].quantity++;

save();

}

function decrease(index){

if(cart[index].quantity>1){

cart[index].quantity--;

}

save();

}

function removeItem(index){

cart.splice(index,1);

save();

}

function save(){

localStorage.setItem("cart",JSON.stringify(cart));

displayCart();

}

function updateSummary(){

let shipping = subtotal>499 ? 0 : 50;

let total = subtotal + shipping;

document.getElementById("subtotal").innerText=subtotal;

document.getElementById("shipping").innerText=shipping;

document.getElementById("total").innerText=total;

}

displayCart();