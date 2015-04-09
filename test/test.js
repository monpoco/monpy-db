/**
 * test module
 *
 */

var debug = require('debug')('monpoco:entity'),
	co = require('co'),
	db = require('..')('mysql');

var config = {
	pool: 5,
	user     : 'root',
	database:'monpy_test'
};

//TEST Table
var CREATE_SQL = "CREATE TABLE IF NOT EXISTS `user` ( "
					  + "`id` int(11) unsigned NOT NULL AUTO_INCREMENT, "
					  + "`login` varchar(32) NOT NULL DEFAULT '', "
					  + "`name` varchar(64) NOT NULL DEFAULT '', "
					  + "`password` varchar(128) NOT NULL DEFAULT '', "
					  + "`sex` tinyint(4) NOT NULL DEFAULT '0', "
					  + "`created_at` datetime DEFAULT NULL, "
					  + "`updated_at` datetime DEFAULT NULL, "
					  + "PRIMARY KEY (`id`), "
					  + "KEY `UK_USER_LOGIN` (`login`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";


// DB Connection
db.connect(config);


/* TEST Model Class */
function User(){
	db.BaseEntity.apply(this, arguments);
}

db.inherits(User, db.BaseEntity);


// Test code.

// Success case
co(function *(){

	// Create Table;
	yield db.query(CREATE_SQL);


	var model = new User();

	// truncate table
	yield model.truncate();


	var from = new Date();
	var to = new Date(from.getTime() + (3600000 * 24) );

	var data = {
		login: 'usr_' + Math.floor(new Date().getTime()/1000),
		name: 'Test Name',
		password: 'password',
		sex: 1,
		created_at:new Date()
	};


	var ret = yield model.save(data);

	var id = ret.insertId;

	var insertedUser = yield model.getById(id);
	console.log('-- INSERT Data ------');
	console.log(insertedUser);

	yield model.updateById(id, {
		updated_at: new Date()
	});

	var updatedUser = yield model.getById(id);
	console.log('-- UPDATE Data ------');
	console.log(updatedUser);

	yield model.deleteById(id);
	var deleteUser = yield model.getById(id);
	console.log('-- Delete Data ------');
	console.log(deleteUser);


	for(var i = 0; i < 30; i++) {
		data = {
			login: 'usr_' + i,
			name: 'Test Name' + i,
			password: 'password' + i,
			sex: (i%2),
			created_at:new Date()
		};
		yield model.insert(data);

	}


	var rows = yield model.where('sex', '=', 0).paginate(0, 10);
	console.log('-- Paginate Data (page index:0, page size: 20) ------');
	console.log(rows);

	console.log('-- Paginate Data (page index:1, page size: 20) ------');
	rows = yield model.where('sex', '=', 0).paginate(1, 10);
	console.log(rows);


	db.end();

	process.exit(0);

}).catch(function(err){
	console.error(err.message);
	console.error(err.stack);

	process.exit(1);
});