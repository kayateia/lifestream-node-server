# LifeStream REST API

## Table of contents

- [General notes](#general-notes)
	- [Parameter types](#parameter-types)
	- [Stream permissions](#stream-permissions)
	- [Failure conditions](#failure-conditions)
- [Image](#image)
	- [POST api/image](#post-apiimage)
	- [GET api/image/:imageid](#get-apiimageimageid)
	- [PUT api/image/:imageid/comment](#put-apiimageimageidcomment)
	- [GET api/image/:imageid/streams](#get-apiimageimageidstreams)
	- [POST api/image/:imageid/streams](#post-apiimageimageidstreams)
	- [DELETE api/image/:imageid/streams](#delete-apiimageimageidstreams)
- [Invite](#invite)
	- [GET api/invite/:streamid](#get-apiinvitestreamid)
	- [GET api/invite/user/:userid](#get-apiinviteuseruserid)
	- [POST api/invite/:streamid](#post-apiinvitestreamid)
	- [DELETE api/invite/:streamid](#delete-apiinvitestreamid)
	- [GET api/invite/:streamid/request](#get-apiinvitestreamidrequest)
	- [GET api/invite/user/:userid/request](#get-apiinviteuseruseridrequest)
	- [POST api/invite/:streamid/request](#post-apiinvitestreamidrequest)
	- [DELETE api/invite/:streamid/request](#delete-apiinvitestreamidrequest)

## General notes

### Parameter types

This document mentions 3 different kinds of parameters.
- **Path component**: These parameters are part of the URL. For example, in _GET_ `api/image/:imageid`, `:imageid` is a path component specifying the numeric ID of the requested image.
- **Query string**: This is how parameters are passed when making _GET_ and _DELETE_ requests. These parameters are appended to the end of the URL. For example, in _GET_ `api/image/15?scaleTo=192&scaleMode=cover`, `scaleTo` and `scaleMode` are query string parameters.
- **Request body**: This is how parameters are passed when making _POST_ and _PUT_ requests. These parameters are received by the server as though they were fields included with a form submission.

### Stream permissions

A stream may have 1 of 3 kinds of permissions. Each permission type is mutually exclusive.
1. **Public**: Anyone may search for, view the contents of, and subscribe to the stream.
2. **Needs Approval**: Anyone may search for the stream, but cannot view images associated with the stream unless those images are associated with at least one _Public_ stream, or at least one other stream to which the viewing user is subscribed. Users cannot directly subscribe to the stream; they must first request an invite, which the stream owner then has to approve.
3. **Hidden**: The stream does not appear in search results, and nobody can view images associated with the stream unless those images are associated with at least one _Public_ stream, or at least one other stream to which the viewing user is subscribed.

### Failure conditions

Database errors may cause any request to fail, and are therefore always a potential failure condition. The **failure condition** sections below will make this assumption, and not explicitly mention database errors.

## Image

### POST api/image

Uploads an image file to the server and associates it with one or more streams. Optionally, a descriptive comment may also be associated with the image.

#### Parameters

- Request body:
	- **image**: Image file as _multipart/form-data_
	- **streamid**: Stream ID. May be a comma-delimited list of stream IDs.
	- **comment** _(optional)_: Comment text

#### Result

If successful, the following response is sent:
```javascript
{
	"success": true,
	"id": /* (number) Image ID of newly uploaded file */
}
```

If the file already existed in the server's uploads directory, no changes are made to the server. The following repsonse is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Image could not be written to disk.

### GET api/image/:imageid

Downloads an image from the server. Optionally, a scaled-down version of the image may be requested.

#### Parameters

- Path component:
	- **imageid**: Image ID
- Query string:
	- **scaleTo** _(optional)_: Number of pixels. If the image is taller or wider than the specified number of pixels, it is scaled down before being sent to the client. This behavious is affected by `scaleMode`.
	- **scaleMode** _(optional)_: _cover_ or _contain_
		- **cover**: The size specified by `scaleTo` applies to the smaller dimension of the image. For example, if an image is originally 640x480 pixels, and `scaleTo` is 192, then the image would be scaled to 256x192 pixels.
		- **contain**: The size specified by `scaleTo` applies to the larger dimensionof the image. For example, if an image is 640x480 pixels, and `scaleTo` is 192, then the image would be scaled to 192x144 pixels.
		- If not specified, or if an invalid value is specified, the default behaviour is _contain_.

#### Permissions

The user who uploaded an image can always view their own image.

Anyone can view images that are associated with at least one _Public_ stream.

Users subscribed to at least one stream associated with a given image can view that image.

#### Result

If successful, the requested image is sent to the client.

If unsuccessful, the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Image could not be read from disk.
- Image could not be scaled as requested.
- User does not have permission to view the image.

### PUT api/image/:imageid/comment

Sets a descriptive comment for the specified image. Any existing comment on the same image will be replaced. The comment may be blank.

#### Parameters

- Path component:
	- **imageid**: Image ID
- Request body:
	- **comment**: Comment text. May be a blank string.

#### Permissions

The user who uploaded an image can set the comment on that image.

#### Result

If successful, the comment is saved on the server and the following response is sent:
```javascript
{
	"success": true
}
```
If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- User does not have permission to set the comment for this image.

### GET api/image/:imageid/streams

Gets a list of streams with which an image is associated.

#### Parameters

- Path component:
	- **imageid**: Image ID

#### Result

The following response is sent:
```javascript
{
	"success": true,
	"id": /* (number) Image ID */,
	"streams": [
		{
			"id": /* (number) Stream ID */,
			"userid": /* (number) User ID of stream owner */,
			"name": /* (string) Stream name */,
			"permission": /* (number) Stream permission type */,
			"userLogin": /* (string) Login of stream owner */,
			"userName": /* (string) Display name of stream owner */
		},
		...
	]
}
```

### POST api/image/:imageid/streams

Associates the specified image with a stream.

#### Parameters

- Path component:
	- **imageid**: Image ID
- Request body:
	- **streamid**: Stream ID

#### Permissions

The user who uploaded an image may associate that image with other streams they own.

#### Result

If successful, an association is created between the specified image and stream, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- User does not own the image.
- User does not own the stream.

### DELETE api/image/:imageid/streams

Dissociates the specified image from a stream.

#### Parameters

- Path component:
	- **imageid**: Image ID
- Query string:
	- **streamid**: Stream ID

#### Permissions

The user who uploaded an image may dissociate that image from streams.

#### Result

If successful, any existing association between the specified image and stream is removed, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- User does not own the image

## Invite

### GET api/invite/:streamid

Gets a list of users who have been invited to the specified stream, who haven't yet accepted the invitation.

#### Parameters

- Path component:
	- **streamid**: Stream ID

#### Result

The following response is sent:
```javascript
{
	"success": true,
	"invites": [
		{
			"streamid": /* (number) Stream ID of the specified stream */,
			"userid": /* (number) User ID of the invited user */,
			"userLogin": /* (string) Login of the invited user */,
			"userName": /* (string) Display name of the invited user */
		},
		...
	]
}
```

### GET api/invite/user/:userid

Gets a list of streams to which the specified user has been invited, where the user hasn't yet accepted the invitation.

#### Parameters

- Path component:
	- **userid**: User ID

#### Result

The following response is sent:
```javascript
{
	"success": true,
	"invites": [
		{
			"streamid": /* (number) Stream ID of the stream to which the user has been invited */,
			"userid": /* (number) User ID of the stream owner */,
			"userLogin": /* (string) Login of the stream owner */,
			"userName": /* (string) Display name of the stream owner */
		},
		...
	]
}
```

### POST api/invite/:streamid

Sends an invitation for the specified stream to the specified user.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Request body:
	- **userid**: User ID

#### Permissions

A user may send invitations for streams they own.

#### Result

If successful, an invitation is created for the specified stream is created for the specified user, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Current user is not the owner of the specified stream
- Specified user is already subscribed to the specified stream
- Specified user has already been invited to the specified stream

### DELETE api/invite/:streamid

Revokes an invitation for the specified stream from the specified user.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Query string:
	- **userid**: User ID

#### Permissions

A user may revoke invitations from streams they own.

The recipient of an invitation may revoke their own invitation.

#### Result

If successful, any outstanding invitation to the specified stream for the specified user is deleted, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Current user is not the stream owner and specified user is not the invitation recipient
- Specified user is not currently invited to stream. This may mean they were not invited invited, or that they already accepted the invitation.

### GET api/invite/:streamid/request

Gets a list of users who have requested an invitation to the specified stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID

#### Result

The following response is sent:
```javascript
{
	"success": true,
	"invites": [
		{
			"streamid": /* (number) Stream ID of the specified stream */,
			"streamName": /* (string) Name of the specified stream */,
			"userid": /* (number) User ID of the invitation requestor */,
			"userLogin": /* (string) Login of the invitation requestor */,
			"userName": /* (string) Display name of the invitation requestor */
		},
		...
	]
}
```

### GET api/invite/user/:userid/request

Gets a list of streams to which the specified user has requested an invitation.

#### Parameters

- Path component:
	- **userid**: User ID

#### Result

The following response is sent:
```javascript
{
	"success": true,
	"invites": [
		{
			"streamid": /* (number) Stream ID of the stream to which the user has requested an invite */,
			"streamName": /* (string) Name of the stream to which the user has requested an invite */
			"userid": /* (number) User ID of the invitation requestor */,
			"userLogin": /* (string) Login of the stream owner */,
			"userName": /* (string) Display name of the stream owner */
		},
		...
	]
}
```

### POST api/invite/:streamid

Requests an invitation to the specified stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Request body:
	- **userid**: User ID of the user requesting an invite

#### Permissions

A user may request an invitation to any stream whose permission setting is _Needs Approval_.

#### Result

If successful, an invitation request from the specified user is created for the specified stream, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- The specified stream's current permission setting isn't _Needs Approval_
- The specified user is already subscribed to the specified stream
- The specified user has already been invited to the specified stream

### DELETE api/invite/:streamid/request

Cancels an invitation request from the specified user to the specific stream

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Query string:
	- **userid**: User ID of the user requesting an invite

#### Permissions

A user may cancel their own invitation requests.

A stream owner may cancel invitation requests to their own streams.

#### Result

If successful, any outstanding invitation request to the specified stream from the specified user is deleted, and the following response is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, no changes are made on the server and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Current user is not the invitation requestor and is not the stream owner
- There is no outstanding invitation request from the specified user to the specified stream
- Specified user has already been invited to the stream
- Specified user is already subscribed to the stream

## Stream

## Subscription

## User
