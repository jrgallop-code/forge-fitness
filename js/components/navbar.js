import {navigate}
from "../core/router.js";


export function renderNavbar(){

setTimeout(()=>{


document.querySelectorAll(".nav-btn")

.forEach(button=>{


button.addEventListener(
"click",

()=>{

navigate(
button.dataset.page
);

}

);


});


},0);



return `

<nav class="bottom-nav">


<button class="nav-btn" data-page="home">

🏠

<span>
Home
</span>

</button>



<button class="nav-btn" data-page="workout">

💪

<span>
Workout
</span>

</button>



<button class="nav-btn" data-page="progress">

📈

<span>
Progress
</span>

</button>



<button class="nav-btn" data-page="goals">

🎯

<span>
Goals
</span>

</button>


</nav>

`;

}