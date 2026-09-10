let wishlist =
    JSON.parse(
        localStorage.getItem("wishlist")
    ) || [];


const container =
    document.getElementById(
        "wishlist-items"
    );


function displayWishlist() {

    container.innerHTML = "";


    if (wishlist.length === 0) {

        container.innerHTML = `

            <div class="empty-wishlist">

                <h2>
                    Your wishlist is empty ♡
                </h2>

                <p>
                    Save your favourite handmade creations here.
                </p>

                <a href="index.html">
                    Continue Shopping
                </a>

            </div>

        `;

        return;

    }


    wishlist.forEach(
        (item, index) => {

            container.innerHTML += `

                <div class="wishlist-card">

                    <img
                        src="${item.image}"
                        alt="${item.name}"
                    >

                    <h2>
                        ${item.name}
                    </h2>

                    <p>
                        ₹${item.price}
                    </p>

                    <button
                        onclick="removeFromWishlist(${index})"
                    >

                        Remove ♡

                    </button>

                </div>

            `;

        }
    );

}


function removeFromWishlist(index) {

    wishlist.splice(index, 1);


    localStorage.setItem(

        "wishlist",

        JSON.stringify(wishlist)

    );


    displayWishlist();

}


displayWishlist();