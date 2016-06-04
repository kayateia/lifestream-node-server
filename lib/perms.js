/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */
'use strict';

const PERM_PUBLIC = 1;
const PERM_APPROVAL = 2;
const PERM_HIDDEN = 3;

let perms = {
	public: PERM_PUBLIC,
	approval: PERM_APPROVAL,
	hidden: PERM_HIDDEN
};

module.exports = perms;
