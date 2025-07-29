	const pageurl = $("h1#title").text();;

	const formurl ='https://docs.google.com/forms/d/e/1FAIpQLSf-nq7XF0CHPE8oSJWRsu8iHXEW0Ho1T7Bu88oeBlcYoKOAiA';
	const sheeturl = 'https://docs.google.com/spreadsheets/d/15arTQ0ruk_xULPjHlS7XcQswjy-yNcycyxXTa5whqRk';

	const pageurlField = "entry.958161920";
	const nameField = "entry.1637742571";
	const emailField = "entry.636687412";
	const commentField = "entry.315787609";
	const parentidField = "entry.542461441";

	let username = '';
	let useremail = '';
	let comment = '';
	let parentid = "0";

	let Comments = [];
	let commentsNumber = 0;
	let visibleRootsNumber = 5;
	let visibleCommentsNumber;

function getValue(id) {
	return document.getElementById(id).value;
};

function show(id) {
	document.getElementById(id).style.display = 'block';
};

function hide(id) {
	document.getElementById(id).style.display = 'none';
};

function clear(id) {
	document.getElementById(id).reset();
};

function formatDate(stringDate) {
		var date = new Date(stringDate);
		var dateOptions = { year: 'numeric', month: 'long', day: 'numeric'};
		var timeOptions = { hour: 'numeric', minute: 'numeric' };
		return `${date.toLocaleDateString("en-us", dateOptions)} at ${date.toLocaleTimeString("en-us", timeOptions)}`;
};

async function getComments() {
	const sql = encodeURIComponent(`SELECT A, C, D, E, F WHERE B = '${pageurl}'`);
	let promise = await fetch(`${sheeturl}/gviz/tq?tqx=out:csv&headers=0&tq=${sql}`);
	let response = await promise.text();
	response = `timestamp,name,email,comment,parentid\n${response}`;
	response = $.csv.toObjects(response);
	response.forEach( element => {
		element.id = Date.parse(element.timestamp).toString();
		element.children = [];
		element.descendantsNumber = countDescendants(element);
	});
	return response;
};

function hideReplyForms(){
	const boxes = Array.from(document.getElementsByClassName('reply-form'));
	boxes.forEach(box => {
		box.reset();
		box.style.display = 'none';
	});
}

function showReplyButtons(){
	const btns = Array.from(document.getElementsByClassName('button-reply'));
	btns.forEach(btn => {
		btn.style.display = 'block';
	});
}

function displayNode(node){
	return `<li>
				<div class="comment-header">
					<div class="comment-name">${validator.escape(node.name)}</div>
					<div class="comment-date">${formatDate(node.timestamp)}</div>
					<div><button class="button-reply" id="button-${node.id}" onClick="hideReplyForms(); showReplyButtons(); show('${node.id}'); clear('button-${node.id}'); hide('button-${node.id}')"> Reply</button></div>
				</div>

				<div class="comment-body">${validator.escape(node.comment).replace(new RegExp('\r?\n','g'), '<br />')}</div>

				<form class="reply-form" id="${node.id}" onsubmit="return ReplyToComment(${node.id})" autocomplete="off">
					<ul>
						<li>
							<input id="name-${node.id}" name="username" type="text" placeholder="Name" required="" value="" />
							<input id="email-${node.id}" name="useremail" type="text" placeholder="Email" required="" value="" />
						</li>
						<li>
							<textarea id="comment-${node.id}" name="comment" placeholder="Comment" required=""></textarea>
						</li>
						<li>
							<input id="submit-${node.id}" type="submit" value="Post" style=" float: left;"/>
							<input type="button" value="Cancel" onClick="clear(${node.id}); hide(${node.id}); show('button-${node.id}')" style=" float: right;">
						</li>
					</ul>
				</form>
			</li>`;
};

function countDescendants(node) {
	let count = 0
	if(!node.children.length) return 0
	for(let element of node.children) {
	  count++
	  count += countDescendants(element)
	}
	return count;
}
/*
function getLevels(list){
	let map = {};
	for (var i = 0; i < list.length; i += 1) {
		let node = list[i];
		map[node.id] = i;
		if (node.parentid !== "0") {
			node.level = list[map[node.parentid]].level + 1;
		}
		else {
			node.level = 1;
		}
	}
};
*/
/*see https://www.twinprimemedia.com/blog/react-creating-a-nested-comment-tree*/

function createTree(list){
	let map = {}, roots = []; 
	for (var i = 0; i < list.length; i += 1) {
		let node = list[i];
		map[node.id] = i;
		if (node.parentid !== "0") {
			list[map[node.parentid]].children.push(node);
		}
		else {
			roots.push(node);
		};
	};
	roots.sort((a,b) => b.id - a.id);
	return roots;
};

function displayTree(nodes) {

	return	`<ul>${nodes.map( node => ` 
			${`${node.children}`
				? `${displayNode(node)}
					${displayTree(node.children)}` 
				:`${displayNode(node)}`}
		`).join('')}
		</ul>`;

}

async function displayComments(){

	Comments = await getComments();
	let CommentsNumber = Comments.length ;
	if (Comments.length > 0){

		let roots = createTree(Comments);

		let visibleRoots = [];

		if(visibleRootsNumber <  roots.length){
			visibleCommentsNumber = visibleRootsNumber;
			for (var i = 0; i < visibleRootsNumber; i += 1 ){
				visibleRoots.push(roots[i]);
				visibleCommentsNumber += countDescendants(roots[i]);
			}
			$('#comments').html(displayTree(visibleRoots));
			show("load-more");
		}
		else{
			visibleCommentsNumber = roots.length;
			for (var i = 0; i < roots.length; i += 1 ){
				visibleRoots.push(roots[i]);
				visibleCommentsNumber += countDescendants(roots[i]);
			}
			$("#comments").html(displayTree(visibleRoots));
			hide("load-more");
		}

		$("#comments-info").html(`<p> Showing <b>${visibleCommentsNumber}</b> of <b>${CommentsNumber}</b> comments</p>`);
	/*
		for (var i = 0; i < roots.length; i += 1) {
			roots[i].descendantsNumber = countDescendants(roots[i]);
		}

	*/

		/*$("#test").append(JSON.stringify(roots.length)+'-------->');*/
		/*$("#test").html(JSON.stringify(roots));*/
		/*$("#test").html(JSON.stringify(roots));*/
	}
	else{
		$("#comments-info").html(`<p>There are currently no comments on this article, be the first to add one below</p>`);
	}

}

function loadMoreComments(){
	visibleRootsNumber = visibleRootsNumber + 5;
	displayComments();
};

const encodeFormData = (data) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
};

function postComment() {
	username = $("#name").val();
	useremail = $("#email").val();
	comment = $("#comment").val();
	parentid = "0";

	fetch(`${formurl}/formResponse`, {
		method: 'POST',
		mode: 'no-cors',
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: encodeFormData({
		[pageurlField] : [pageurl],
		[nameField] : [username],
		[emailField] : [useremail],
		[commentField] : [comment],
		[parentidField] : [parentid]
		})
	}).then(response => {
				$("#name").val('');
				$("#email").val('');
				$("#comment").val('');
				displayComments();
			})

	return false;
};

function ReplyToComment(id) {
	username = $("#name-"+id).val();
	useremail = $("#email-"+id).val();
	comment = $("#comment-"+id).val();
	parentid = id;

	fetch(`${formurl}/formResponse`, {
	  method: 'POST',
	  mode: 'no-cors',
	  headers: {
	    "Content-Type": "application/x-www-form-urlencoded"
	  },
	  body: encodeFormData({
	  	[pageurlField] : [pageurl],
	  	[nameField] : [username],
	  	[emailField] : [useremail],
	  	[commentField] : [comment],
	  	[parentidField] : [parentid]
	  })
	}).then(response => {
		$("#name-"+id).val('');
		$("#email-"+id).val('');
		$("#comment-"+id).val('');
		clear(id);
		hide(id);
		displayComments();
	})
	.catch(error => {console.log(error);});
	return false;
};
