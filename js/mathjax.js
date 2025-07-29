window.MathJax = {

extensions: ["tex2jax.js"],

jax: ["input/TeX", "output/HTML-CSS"],

tex2jax: {
	inlineMath: [ ['$','$'], ["\\(","\\)"] ],
	displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
	processEscapes: true
},

"HTML-CSS": { fonts: ["TeX"], scale: 100 },

TeX: {
	extensions: ["AMSmath.js", "AMSsymbols.js", "newcommand.js"],
	equationNumbers: { autoNumber: "AMS" },
	Macros: {
		RR: '{\\mathbb R}',
		PP: '{\\mathbb P}',
		EE: '{\\mathbb E}',
		var: '{\\mathbb V}\\!{\\rm ar}',
		Qcal: '{\\mathcal Q}',
		l: '{<}',
		g: '{>}',
	}
}
};
