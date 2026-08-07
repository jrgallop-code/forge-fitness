import {
navigate
}
from "./core/router.js";


import {
renderNavbar
}
from "./components/navbar.js";



navigate("home");



document.body.insertAdjacentHTML(

"beforeend",

renderNavbar()

);