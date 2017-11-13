var Editor = Editor || {};

class UserState {
	constructor(_user_id) {
		this.id = _user_id;
		this.t = 0;
		this.x = 0;
		this.y = 0;
		this.tool = 0;

	}

	renderUser() {
		
	}
}

if (typeof module !== "undefined") {
	module.exports = UserState;
} else {
	window.UserState = Editor.UserState = UserState;
}
