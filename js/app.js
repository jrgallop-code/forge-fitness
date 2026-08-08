import {
navigate
}
from "./core/router.js?v=router-more-1";


import {
renderNavbar
}
from "./components/navbar.js?v=navbar-more-1";



navigate("home");



document.body.insertAdjacentHTML(

"beforeend",

renderNavbar()

);
