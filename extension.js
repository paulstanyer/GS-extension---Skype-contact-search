// Builds on the good work of other search provider extensions,
// particulary 'appsearch@luv.github.com'
//
const St = imports.gi.St;
const Main = imports.ui.main;
const Search = imports.ui.search;
const DBus = imports.dbus;

let skypeSearchProvider, SkypeProxy;
let allFriends = [];

const SkypeAPI = {
    name: 'com.Skype.API',
    methods: [
        {    //method name and signature
            name: 'Invoke',
            inSignature: 's', // single (S)tring parameter
            outSignature: 's' // returns a (S)tring
        }
    ]
};

function SkypeSearchProvider() {
    this._init.apply(this, arguments);
}

SkypeSearchProvider.prototype = {
   
    // inherits from Search.SearchProvider
    __proto__: Search.SearchProvider.prototype,

    _init: function(title) {

        Search.SearchProvider.prototype._init.call(this, title);
	let SProx = DBus.makeProxyClass(SkypeAPI);
	SkypeProxy = new SProx(DBus.session,
		'com.Skype.API',
		'/com/Skype');
	// init API
	SkypeProxy.InvokeRemote('NAME GnomeSearchProvider');
	SkypeProxy.InvokeRemote('PROTOCOL 7');

	// build friends list (once)
	SkypeProxy.InvokeRemote('SEARCH FRIENDS', function (res, err) {
		// remove the USERS response, and then split
		let friends = res.substr(6).split(", ");
		for (i in friends) {
			let uid = friends[i];
			SkypeProxy.InvokeRemote('GET USER '+uid+' FULLNAME', function (res2, err2) {
				// remove user and uid plus fullname prefix						
				let fullname = res2.replace(/USER\s.*\sFULLNAME\s/, '');
				if (fullname.length > 1) {
					allFriends.push({id: uid, name: fullname});
				}
			});
		}
	});
    },

    getInitialResultSet: function(terms) {
	let matched = [];
	// first escape user input
	terms = terms.toString().replace(/([\^[$.|?*)(+-])/gi, "\\$1");
	let rg = RegExp( terms, "gi");
	for(i in allFriends) {
		let friend = allFriends[i];
		if (rg.test(friend.name) || rg.test(friend.id)) {
			matched.push(friend);
		}
	}
        return matched;
    },

    getSubsearchResultSet: function(prevResults, terms) {
        return this.getInitialResultSet(terms);
    },

    getResultMeta: function(resultId) {
        return {
            'id': resultId,
            'name': resultId.name,
            'createIcon': function(size) {
                return new St.Icon({ 
                    'icon_type': St.IconType.FULLCOLOR,
                    'icon_size': size,
                    'icon_name': "skype-contact"
                });
            }
        };
    },

    activateResult: function(resultId) {
        let resp, bits;
	SkypeProxy.InvokeRemote('CHAT CREATE '+resultId.id, function (res, err) {
		bits = res.split(" ");
		SkypeProxy.InvokeRemote('OPEN CHAT '+bits[1], function (res, err) {});
	});
    },
}

function init() {
    skypeSearchProvider = new SkypeSearchProvider('Skype Contact Search');
}

function enable() {
    Main.overview.addSearchProvider(skypeSearchProvider);
}

function disable() {
    Main.overview.removeSearchProvider(skypeSearchProvider);
}
