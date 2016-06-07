/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */
'use strict';

// Stream permissions
//
// PUBLIC: anyone can search for, view images in, and subscribe to stream
// APPROVAL: anyone can search for and request invite to stream
// HIDDEN: stream hidden from search results; owner may invite others
const PERM_PUBLIC = 1;
const PERM_APPROVAL = 2;
const PERM_HIDDEN = 3;

// Subscription states
//
// ACTIVE: user is subscribed to stream
// INVITED: user has been invited to stream
// REQUESTED: user has requested invite to stream
const SUB_ACTIVE = 1;
const SUB_INVITED = 2;
const SUB_REQUESTED = 3;

const perms = {
	public: PERM_PUBLIC,
	approval: PERM_APPROVAL,
	hidden: PERM_HIDDEN
};

const sub = {
	active: SUB_ACTIVE,
	invited: SUB_INVITED,
	requested: SUB_REQUESTED
};

module.exports = {
	perms: perms,
	sub: sub
};
