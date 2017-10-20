/** @namespace model/Charity */

// Initialize dependencies
const Mongoose = require('mongoose');
const Async = require('async');
const Tokens = require('jsonwebtoken');
const Database = require('./../tools/Database');
const Dates = require('./../tools/Dates');

// Initialize config
const config = require('./../../config');

/**
 * Checks if authenticated user can edit charity
 * @memberof model/Charity
 * @param {Object} charity Charity object
 * @param {Object} token Decoded token object
 * @return {Boolean} True if user can edit charity
 */
function authenticatedToken (charity, token) {
	if (token.charity == charity.guid) return true;
	return false;
};

// Charity Properties: configures properties for database object
function CharityProperties (schema) {
    schema.add({

		// Name: name of charity
		'name': {
			'type': String,
			'index': true,
			'required': true,
		},

		// Description: description of charity
		'description': {
			'type': String,
			'default': "",
		},

		// Logo: URL of charity logo
		'logo': {
			'type': String,
			'default': "",
		},

		// Charity Token: GUID of the token used to create charity
		'charityToken': {
			'type': String,
			'required': true,
		},

		// Users: GUID of the users that can access this charity
		'users': {
			'type': Array,
			'default': [],
		},

		// Campaigns: GUID of the campaigns that belong to this charity
		'campaigns': {
			'type': Array,
			'default': [],
		},

		// Updates: GUID of the updates that belong to this charity
		'updates': {
			'type': Array,
			'default': [],
		},

    });
};

// Charity Static Methods: attaches functionality used by the schema in general
function CharityStaticMethods (schema) {

	/**
	 * Creates a new charity in the database
	 * @memberof model/Charity
	 * @param {Object} params
	 * @param {String} params.name Name of campaign
	 * @param {Object} params.charityToken Charity Token object
	 * @param {function(err, charity)} callback Callback function
	 */
	schema.statics.create = function ({name, charityToken}, callback) {

		// Save reference to model
		var Charity = this;

		// Synchronously perform the following tasks, then make callback...
		Async.waterfall([

			// Generate a unique GUID
			function (callback) {
				Charity.GUID(function (err, GUID) {
					callback(err, GUID);
				})
			},

			// Write new charity to the database
			function (GUID, callback) {

				// Setup query with GUID
				var query = {
					'guid': GUID
				};

				// Setup database update
				var update = {
					'$set': {
						'guid': GUID,
						'name': name,
						'charityToken': charityToken.guid,
						'dateCreated': Dates.now(),
					}
				};

				// Make database update
				Database.update({
					'model': Charity,
					'query': query,
					'update': update,
				}, function (err, charity) {
					callback(err, charity);
				});
			},

		], function (err, charity) {
			callback(err, charity);
		});
	};
};

// Charity Instance Methods: attaches functionality related to existing instances of the object
function CharityInstanceMethods (schema) {

	/**
	 * Adds a user to the users array
	 * @memberof model/Charity#
	 * @param {Object} params
	 * @param {Object} params.user User object to be added
	 * @param {function(err, charity)} callback Callback function
	 */
	schema.methods.addUser = function ({user}, callback) {

		// Note: doesn't require authorization (addUser called after create)

		// Save reference to model
		var Charity = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var update = {
			'$push': {
				'users': user.guid,
			}
		};

		// Make database update
		Database.update({
			'model': Charity.constructor,
			'query': query,
			'update': update,
		}, function (err, charity) {
			callback(err, charity);
		});
	};

	/**
	 * Adds a campaign to the campaigns array
	 * @memberof model/Charity#
	 * @param {Object} params
	 * @param {Object} params.campaign Campaign object to be added
	 * @param {Object} params.token Decoded authentication token object
	 * @param {function(err, charity)} callback Callback function
	 */
	schema.methods.addCampaign = function ({campaign, token}, callback) {

		// Authenicate user
		if (!authenticatedToken(this, token))
			return callback(Secretary.authenticationError(Messages.authErrors.noAccess));

		// Save reference to model
		var Charity = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var update = {
			'$push': {
				'campaigns': campaign.guid,
			}
		};

		// Make database update
		Database.update({
			'model': Charity.constructor,
			'query': query,
			'update': update,
		}, function (err, charity) {
			callback(err, charity);
		});
	};

	/**
	 * Adds an update to the updates array
	 * @memberof model/Charity#
	 * @param {Object} params
	 * @param {Object} params.update Update object to be added
	 * @param {Object} params.token Decoded authentication token object
	 * @param {function(err, charity)} callback Callback function
	 */
	schema.methods.addUpdate = function ({update, token}, callback) {

		// Authenicate user
		if (!authenticatedToken(this, token))
			return callback(Secretary.authenticationError(Messages.authErrors.noAccess));

		// Save reference to model
		var Charity = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var dbupdate = {
			'$push': {
				'updates': update.guid,
			}
		};

		// Make database update
		Database.update({
			'model': Charity.constructor,
			'query': query,
			'update': dbupdate,
		}, function (err, charity) {
			callback(err, charity);
		});
	};

	/**
	 * Edits a charity object
	 * @memberof model/Charity#
	 * @param {Object} params
	 * @param {Object} params.token Decoded authentication token object
	 * @param {String} params.name Name of charity
	 * @param {String} params.description Description of charity
	 * @param {String} params.logo Image URL of charity logo
	 * @param {function(err, charity)} callback Callback function
	 */
	schema.methods.edit = function ({token, name, description, logo}, callback) {

		// Authenicate user
		if (!authenticatedToken(this, token))
			return callback(Secretary.authenticationError(Messages.authErrors.noAccess));

		// Save reference to model
		var Charity = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var set = {
			'lastModified': Dates.now(),
		};
		if (name) set.name = name;
		if (description) set.description = description;
		if (logo) set.logo = logo;
		var update = {
			'$set': set
		};

		// Make database update
		Database.update({
			'model': Charity.constructor,
			'query': query,
			'update': update,
		}, function (err, charity) {
			callback(err, charity);
		});
	};

};

// Export charityToken model object
module.exports = function () {

	// Make schema for new charity object...
	var charitySchema = new Mongoose.Schema;

	// Inherit Object properties and methods
	require('./Object')(charitySchema);

	// Add charity properties and methods to schema
	CharityProperties(charitySchema);
	CharityStaticMethods(charitySchema);
	CharityInstanceMethods(charitySchema);

	// Create new model object with schema
	var charity = Mongoose.model('Charity', charitySchema);

	// Return new model object
	return charity;
}();