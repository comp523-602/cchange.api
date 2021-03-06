/** @namespace model/Post */

// Initialize dependencies
const Mongoose = require('mongoose');
const Async = require('async');
const Tokens = require('jsonwebtoken');
const Database = require('./../tools/Database');
const Dates = require('./../tools/Dates');

// Initialize external models
const Charity = require('./Charity.js');
const Campaign = require('./Campaign.js');
const User = require('./User.js');

/**
 * Checks if authenticated user can edit post
 * @memberof model/Post
 * @param {Object} post Post object
 * @param {Object} token Decoded token object
 * @return {Boolean} True if user can edit post
 */
function authenticatedToken (post, token) {
	if (token.user == post.user) return true;
	return false;
};

// Post Properties: configures properties for database object
function PostProperties (schema) {
    schema.add({

		// OBJECT TYPE
		'objectType': {
			'type': String,
			'default': "post"
		},

		// User: GUID of the user this post belongs to
		'user': {
			'type': String,
			'required': true,
		},

		// Campaign: GUID of the campaign this post supports
		'campaign': {
			'type': String,
			'required': true,
		},

		// Category: Category of the campaign this post supports
		'category': {
			'type': String,
			'index': true,
			'required': true,
		},

		// Charity: GUID of the charity this post supports
		'charity': {
			'type': String,
			'required': true,
		},

		// Image: URL of the post image
		'image': {
			'type': String,
			'required': true,
		},

		// Shareable Image: URL of the shareable post image
		'shareableImage': {
			'type': String,
			'required': true,
		},

		// Caption: Caption for the post
		'caption': {
			'type': String,
			'index': true,
		},

		// Donations: donations made to post
		'donations': {
			'type': Array,
			'default': [],
		},

    });

	schema.index({'caption': 'text'});
};

// Post Static Methods: attaches functionality used by the schema in general
function PostStaticMethods (schema) {

	/**
	 * Creates a new post in the database
	 * @memberof model/Post
	 * @param {Object} params
	 * @param {Object} params.user User object of post creator
	 * @param {Object} params.campaign Campaign object associated with post
	 * @param {String} params.image Image URL
	 * @param {String} params.caption Post caption
	 * @param {String} params.shareableImage Shareable image URL
	 * @param {function(err, post)} callback Callback function
	 */
	schema.statics.create = function ({user, campaign, charity, image, caption, shareableImage}, callback) {

		// Save reference to model
		var Post = this;

		// Synchronously perform the following tasks, then make callback...
		Async.waterfall([

			// Generate a unique GUID
			function (callback) {
				Post.GUID(function (err, GUID) {
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
				var set = {
					'guid': GUID,
					'user': user.guid,
					'campaign': campaign.guid,
					'category': campaign.category,
					'charity': charity.guid,
					'image': image,
					'shareableImage': shareableImage,
					'dateCreated': Dates.now(),
				};
				if (caption) set.caption = caption;
				var update = {
					'$set': set
				};

				// Make database update
				Database.update({
					'model': Post,
					'query': query,
					'update': update,
				}, function (err, post) {
					callback(err, post);
				});
			},

		], function (err, post) {
			callback(err, post);
		});
	};
};

// Post Instance Methods: attaches functionality related to existing instances of the object
function PostInstanceMethods (schema) {

	/**
	 * Formats a campaign object to be returned to the client
	 * @memberof model/Post#
	 * @param {Object} params
	 * @param {Object} params.req Express.js request object
	 * @param {Object} params.res Express.js response object
	 * @param {function(err, formattedObject)} callback Callback function
	 */
	schema.methods.format = function ({req, res}, callback) {

		// Initialize formatted object
		var thisObject = this.toObject();

		Async.waterfall([

			// Attach charity metadata
			function (callback) {
				Database.findOne({
					'model': Charity,
					'query': {
						'guid': thisObject.charity,
					}
				}, function (err, charity) {
					if (charity) {
						thisObject.charityName = charity.name;
						thisObject.charityLogo = charity.logo;
						thisObject.charityDescription = charity.description;
					}
					callback();
				});
			},

			// Attach campaign metadata
			function (callback) {
				Database.findOne({
					'model': Campaign,
					'query': {
						'guid': thisObject.campaign,
					}
				}, function (err, campaign) {
					if (campaign) {
						thisObject.campaignName = campaign.name;
						thisObject.campaignDescription = campaign.description;
					}
					callback();
				});
			},

			// Attach user metadata
			function (callback) {
				Database.findOne({
					'model': User,
					'query': {
						'guid': thisObject.user,
					}
				}, function (err, user) {
					if (user) {
						thisObject.userName = user.name;
					}
					callback();
				});
			},

		], function (err) {
			callback(err, thisObject);
		})
	};

	/**
	 * Adds a donation to the donation array
	 * @memberof model/Post#
	 * @param {Object} params
	 * @param {Object} params.donation Donation object to be added
	 * @param {function(err, post)} callback Callback function
	 */
	schema.methods.addDonation = function ({donation}, callback) {

		// Save reference to model
		var Post = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var update = {
			'$push': {
				'donations': donation.guid,
			}
		};

		// Make database update
		Database.update({
			'model': Post.constructor,
			'query': query,
			'update': update,
		}, function (err, campaign) {
			callback(err, campaign);
		});
	};

	/**
	 * Edits an existing post
	 * @memberof model/Post#
	 * @param {Object} params
	 * @param {Object} params.token Decoded authentication token object
	 * @param {String} [params.image] Image URL
	 * @param {String} [params.caption] Post caption
	 * @param {function(err, post)} callback Callback function
	 */
	schema.methods.edit = function ({token, caption}, callback) {

		// Authenicate user
		if (!authenticatedToken(this, token))
			return callback(Secretary.authenticationError(Messages.authErrors.noAccess));

		// Save reference to model
		var Post = this;

		// Setup query with GUID
		var query = {
			'guid': this.guid,
		};

		// Setup database update
		var set = {
			'lastModified': Dates.now(),
		};
		if (caption) set.caption = caption;
		var update = {
			'$set': set
		};

		// Make database update
		Database.update({
			'model': Post.constructor,
			'query': query,
			'update': update,
		}, function (err, post) {
			callback(err, post);
		});
	};

};

// Export update model object
module.exports = function () {

	// Make schema for new post object...
	var postSchema = new Mongoose.Schema;

	// Inherit Object properties and methods
	require('./Object')(postSchema);

	// Add update properties and methods to schema
	PostProperties(postSchema);
	PostStaticMethods(postSchema);
	PostInstanceMethods(postSchema);

	// Create new model object with schema
	var post = Mongoose.model('Post', postSchema);

	// Return new model object
	return post;
}();