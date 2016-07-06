# LifeStream REST API

## Table of contents

- [General notes](#general-notes)
	- [Authorization](#authorization)
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
- [Stream](#stream)
	- [GET api/stream/list](#get-apistreamlist)
	- [GET api/stream/search](#get-apistreamsearch)
	- [GET api/stream/:streamid/contents](#get-apistreamstreamidcontents)
	- [POST api/stream](#post-apistream)
	- [GET api/stream/:streamid](#get-apistreamstreamid)
	- [PUT api/stream/:streamid](#put-apistreamstreamid)
	- [DELETE api/stream/:streamid](#delete-apistreamstreamid)
- [Subscription](#subscription)
	- [GET api/subscription/user/:userid](#get-apisubscriptionuseruserid)
	- [GET api/subscription/:streamid](#get-apisubscriptionstreamid)
	- [GET api/subscription/:streamid/state](#get-apisubscriptionstreamidstate)
	- [POST api/subscription/:streamid](#post-apisubscriptionstreamid)
	- [DELETE api/subscription/:streamid](#delete-apisubscriptionstreamid)
- [User](#user)
	- [POST api/user/login/:login](#post-apiuserloginlogin)
	- [GET api/user/search](#get-apiusersearch)
	- [GET api/user/new-token](#get-apiusernewtoken)
	- [GET api/user/login/:login](#get-apiuserloginlogin)
	- [GET api/user/:userid](#get-apiuseruserid)
	- [POST api/user](#post-apiuser)
	- [PUT api/user/:userid](#put-apiuseruserid)
	- [DELETE api/user/:userid](#delete-apiuseruserid)
	- [POST api/user/register-device](#post-apiuserregisterdevice)

## General notes

### Authorization

All API calls require a valid authorisation token. The token is provided by [POST api/user/login/:login](#post-apiuserloginlogin) in response to a successful sign-in attempt.

Once a token has been obtained, it can be used 2 ways:

1. Include an Authorization HTTP header with each request, of the form:

	> Authorization: Bearer token\_content\_goes\_here

2. Include a cookie called "**authorization**" with each request. The cookie's content should have the form:

	> Bearer%20token\_content\_goes\_here

If no authorisation token is included with a request, the following response is sent:

```javascript
{
	"success": false,
	"error": "Missing bearer token"
}
```

If an invalid uthorisation token was included, the following response is sent:

```javascript
{
	"success": false,
	"error": "Token is invalid"
}
```

If a valid authorisation token was included, but the token has expired, the following response is sent:

```javascript
{
	"success": false,
	"error": "Token has expired"
}
```

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

Uploads an image file to the server and associates it with a stream. Optionally, a descriptive comment may also be associated with the image.

If an image needs to be associated with more than one stream, that can be achieved using subsequent calls to [POST api/image/:imageid/streams](#post-apiimageimageidstreams).

#### Parameters

- Request body:
	- **image**: Image file as _multipart/form-data_
	- **streamid**: Stream ID
	- **comment** _(optional)_: Comment text

#### Permissions

A user can upload an image to a stream they own.

**DEPRECATED:** A user can also upload an image to stream ID 1, the "Global Stream".

#### Result

If successful, the image is written to disk on the server, a notification is sen to all mobile clients watching the stream to which the image was uploaded, and the following response is sent:

```javascript
{
	"success": true,
	"id": /* (number) Image ID of newly uploaded file */
}
```

If the file already existed in the server's uploads directory, no changes are made to the server. The following response is sent:

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

If successful, an association is created between the specified image and stream, a notification is sent to all mobile clients watching the specified stream, and the following response is sent:

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

Sends an invitation for the specified stream to the specified user. If the user had previously requested an invitation to the stream, that request is consumed in the process of creating the invitation.

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

### GET api/stream/list

Gets a list of streams known to the server. The result set excludes _Hidden_ streams unless `userid` is specified and is the same as the current user.

#### Parameters

- Query string:
	- **userid** _(optional)_: User ID of user whose streams to list. If specified, and it is the user ID of the current user, then _Hidden_ streams will be included in the result set.

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"streams": [
		{
			"id": /* (number) Stream ID */,
			"userid": /* (number) User ID of stream owner */,
			"name": /* (string) Stream name */,
			"permission": /* (number) Stream permission setting */,
			"userLogin": /* (string) Login of stream owner */,
			"userName": /* (string) Display name of stream owner */
		},
		...
	]
}
```

### GET api/stream/search

Search for streams whose names match a given substring. _Hidden_ streams are excluded from results.

#### Parameters

- Query string:
	- q: Substring to match

#### Permissions

Streams whose permission setting is _Public_ or _Needs Approval_ will appear in search results.

#### Result

If successful, the following response is sent:

```javascript
{
	"success": true,
	"streams": [
		{
			"id": /* (number) Stream ID */,
			"userid": /* (number) User iD of stream owner */,
			"name": /* (string) Stream name */,
			"permission": /* (number) Stream permission setting */,
			"userLogin": /* (string) Login of stream owner */,
			"userName": /* (string) Display name of stream owner */
		},
		...
	]
}
```

The above response is sent even if no matching streams are found; in that case, the `streams` array in the result set will be zero-length array.

#### Failure conditions

- `q` is blank

### GET api/stream/:streamid/contents

Get list of images in the specified stream. Images are sorted in reverse chronological order of upload time.

#### Parameters

- Path component:
	- **streamid**: Stream ID. May be a comma-delimited list of stream IDs
- Query string:
	- **olderThan** _(optional)_: Number of seconds since the UNIX epoch. Only images whose upload time is older than this will be included in the result set
	- **olderThanId** _(optional)_: Image ID. Only images whose image ID is lower than this will be included in the result set
	- **count** _(optional)_: Number of images to include in the result set. The result set contains newer images first.

#### Permissions

Any user may request a list of contents from any stream, but the actual image will not be displayable unless it passes permission checks in [GET api/image/:imageid](#get-apiimageimageid).

#### Result

If successful, the following response is sent:

```javascript
{
	"success": true,
	"images": [
		{
			"id": /* (number) Image ID */,
			"userid": /* (number) User ID of uploader */,
			"userLogin": /* (string) Login of uploader */,
			"userName": /* (string) Display name of uploader */,
			"uploadTime": /* (number) When the image was uploaded, in number of seconds since the UNIX epoch */,
			"comment": /* (string) Descriptive comment */
		},
		...
	]
}
```

### POST api/stream

Create a stream. The newly created stream will be owned by the current user.

#### Parameters

- Request body:
	- **userid**: User ID of stream owner
	- **name**: Name of stream
	- **permission**: [Stream permission](#stream-permissions) setting

#### Permissions

A user can only create a stream where `userid` is their own user ID.

Admins can create streams where `userid` is not their own user ID.

#### Result

If successful, a stream belonging to the given user is created, and the following response is sent:

```javascript
{
	"success": true,
	"id": /* (number) ID of the newly created stream*/
}
```

#### Failure conditions

- `userid` does not match the current user's ID, and current user is not an admin

### GET api/stream/:streamid

Gets information about a stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"id": /* (number) Stream ID */,
	"userid": /* (number) User ID of stream owner */,
	"name": /* (string) Stream name */,
	"permission": /* (number) Stream permission setting */,
	"userLogin": /* (string) Login of stream owner */,
	"userName": /* (string) Display name of stream owner */
}
```

### PUT api/stream/:streamid

Modifies the specified stream, provided that it exists.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Request body:
	- **name** _(optional)_: Stream name
	- **permission** _(optional)_: [Stream permission](#stream-permissions) setting

#### Permissions

A user may modify their own stream.

An admin may modify any stream.

#### Result

If successful, the stream is modified as requested and the following response is sent:

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

- No changes were requested (e.g. none of the optional parameters were provided)
- User does not own the specified stream and user is not an admin

### DELETE api/stream/:streamid

Deletes the specified stream

#### Parameters

- Path component:
	- **streamid**: Stream ID

#### Permissions

A user may delete streams they own.

An admin may delete any stream.

#### Result

If successful, all of the following are deleted:

- The specified stream
- Subscriptions to the specified stream
- Invitations to the specified stream
- Invitation requests for the specified stream
- Associations of images to the specified stream

And the following response is sent:

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

- The user is not the stream owner and is not an admin

## Subscription

### GET api/subscription/user/:userid

Get list of streams to which the specified user is subscribed.

#### Parameters

- Path component:
	- **userid**: User ID

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"subscriptions": [
		{
			"streamid": /* (number) Stream ID */,
			"streamName": /* (string) Stream name */,
			"userid": /* (number) User ID of stream owner */,
			"userLogin": /* (string) Login of stream owner */,
			"userName": /* (string) Display name of stream owner */
		},
		...
	]
}
```

### GET api/subscription/:streamid

Get list of users subscribed to the specified stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"subscriptions": [
		{
			"streamid": /* (number) Stream ID */,
			"streamName": /* (string) Stream name */,
			"userid": /* (number) User ID of subscriber */,
			"userLogin": /* (string) Login of subscriber */,
			"userName": /* (string) Display name of subscriber */
		},
		...
	]
}
```

### GET api/subscription/:streamid/state

Get the state of a the specified user's subscription relative to the specified stream(s).

Subscriptions may be 1 of 3 states (i.e. they are mutually exclusive):

1. **active**: User is currently subscribed to stream
2. **invited**: User has been invited to stream
3. **requested**: User has requested invitation to stream

#### Parameters

- Path component:
	- **streamid**: Stream ID. May be a comma-delimited list of stream IDs
- Query string:
	- **userid**: User ID

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"states": [
		{
			"streamid": /* (number) Stream ID */,
			"userid": /* (number) User ID */,
			"state": /* (string) Subscription state */
		},
		...
	]
}
```

### POST api/subscription/:streamid

Subscribes the specified user to the specified stream. If the user has an invitation to the stream, or if the user had requested an invitation for the stream, those are consumed in the process of subscribing to the stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Request body:
	- **userid**: User ID

#### Permissions

Users can subscribe themselves to _Public_ streams.

Users can subscribe themselves to _Needs Approval_ and _Hidden_ streams for which they have an invitation.

#### Result

If successful, the specified user is subscribed to the specified stream. Any existing invitation for the user to join that stream, or invite request from the user for that stream, is consumed and replaced by the subscription. The following response is sent:

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

- User is already subscribed to stream
- User's ID does not match `userid`
- Stream is not _Public_ and user doesn't have an invitation for the stream

### DELETE api/subscription/:streamid

Unsubscribes the specified user from the specified stream.

#### Parameters

- Path component:
	- **streamid**: Stream ID
- Query string:
	- **userid**: User ID

#### Permissions

Users can unsubscribe themselves from a stream.

A stream owner can unsubscribe other users from streams they own.

#### Result

If successful, the specified user is unsubscribed from the specified stream, and the following response is sent:

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

- User is not subscribed to stream
- User's ID does not match `userid`, and user is not the stream owner

## User

### POST api/user/login/:login

Obtains an authorisation token for further requests.

#### Parameters

- Path component:
	- **login**: Username
- Request body:
	- **password**: Password in cleartext

#### Permissions

This is the only API call that can be accessed without providing a valid authorisation token.

#### Result

If successful, the following response is sent:

```javascript
{
	"success": true,
	"token": /* (string) Authorisation token */
}
```

If unsucessful, the following response is sent:

```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- Login or password were not specified
- Login and password don't match any users in the database

### GET api/user/search

Search for users whose login or display name matches a given substring.

#### Parameters

- Query string:
	- **q**: Search terms

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"users": [
		{
			"id": /* (number) User ID */,
			"login": /* (string) User's login */,
			"name": /* (string) User's display name */
		},
		...
	]
}
```

If no users matching the given search terms were found, then the `users` array in the response is blank.

### GET api/user/new-token

An authorisation token expires an hour after it is issued (**TODO: This functionality is implemented but not currently enabled in the code**), so it needs to be periodically refreshed.

The server responds to this request with a newly-generated authorisation token, effectively extending the lifetime of the user's session as long as the request is made before the user's current authorisation token expires.

#### Result

The following response is sent:

```javascript
{
	"success": true,
	"token": /* (string) Authorisation token */
}
```

#### Failure conditions

- User does not currently have a valid authorisation token

### GET api/user/login/:login

Gets information about the user associated with the specified login.

#### Parameters

- Path component:
	- **login**: Username

#### Result

If successful, the following response is sent:

```javascript
{
	"success":true,
	"id": /* (number) User ID */,
	"login": /* (string) User login */,
	"name": /* (string) User's display name */,
	"email": /* (string) User's email address */,
	"isAdmin": /* (boolean) true if the user is an admin, false otherwise */
}
```

If unsucessful, the following response is sent:

```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- No user with the given login exists

### GET api/user/:userid

Gets information about the user associated with the specified user ID.

#### Parameters

- Path component:
	- **userid**: User ID

#### Result

If successful, the following response is sent:

```javascript
{
	"success":true,
	"id": /* (number) User ID */,
	"login": /* (string) User login */,
	"name": /* (string) User's display name */,
	"email": /* (string) User's email address */,
	"isAdmin": /* (boolean) true if the user is an admin, false otherwise */
}
```

If unsucessful, the following response is sent:

```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

#### Failure conditions

- No user with the given user ID exists

### POST api/user

Creates a user.

#### Parameters

- Request body:
	- **login**: Username
	- **password**: Password in cleartext
	- **name**: Display name
	- **email** _(optional)_: Email address
	- **isAdmin** _(optional)_: `true` if user is admin, `false` otherwise

#### Permissions

Admins can create new users.

#### Result

If successful, a new user is created and the following response is sent:

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

- Specified login already exists
- Specified name already exists
- Requesting user is not an admin

### PUT api/user/:userid

Modify existing user.

#### Parameters

- Path component:
	- **userid**: User ID
- Request body:
	- **password**: Password in cleartext
	- **name**: Display name
	- **email** _(optional)_: Email address
	- **isAdmin** _(optional)_: `true` if user is admin, `false` otherwise

#### Permissions

Users can modify their own user info.

Users cannot modify their own isAdmin flag.

Admins can modify any existing user.

Admins can modify the isAdmin flag for other users.

#### Result

If successful, the specified user's information on the server is updated, and the following response is sent:

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

- Specified name would be non-unique after the change
- Requesting user is not an admin and is trying to edit another user

### DELETE api/user/:userid

Deletes a user.

#### Parameters

- Path component:
	- **userid**: User ID

#### Permissions

Admins can delete users.

#### Result

If successful, all of the following are deleted:

- All subscriptions, invites, and invite requests relating to the specified user
- All subscriptions invites, and invite requests relating to the specified user's streams
- All associations between images and the specified user's streams
- All streams owned by the specified user
- All images uploaded by the specified user
- The specified user

The following response is sent:

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

### POST api/user/register-device

Register a device for push notifications.

#### Parameters

- Request body:
	- **id**: Unique identifier from the device
	- **type**: Push notification service. Supported types include:
		- google
		- apple **(TODO: not implemented)**
		- microsoft **(TODO: not implemented)**
	- **token**: Token provided to the mobile app by the upstream push service provider

#### Result

If successful, the following response is sent:

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

- Unrecognised service `type`
