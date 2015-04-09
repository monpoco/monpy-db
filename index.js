/**
 * monpy-db
 *
 * Copyright (c) 2015 monpoco
 * MIT Licensed
 */


var SupportDBs = ['mysql'];

module.exports = function(adapter){

	if(SupportDBs.indexOf(adapter) === -1) {
		throw new Error('Sorry. "%s" is not support. orz\nSupport DB => %s', adapter, SupportDBs.join(', '));
	}

	var db;
	switch(adapter) {
		case 'mysql':
			db = require('./mysql/entity');
			break;
	}
	return db;
};