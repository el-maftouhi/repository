//Get the button
let buttonTop = document.getElementById("buttonTop");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    buttonTop.style.display = "block";
  } else {
    buttonTop.style.display = "none";
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	})
}

buttonTop.addEventListener("click", topFunction);