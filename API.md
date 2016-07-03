# LifeStream REST API

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

If unsuccessful, the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

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
If unsuccessful, server data is not modified and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

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

If unsuccessful, no association is created between the specified image and stream, and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

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

If unsuccessful, no change in association is made between the specified image and stream, and the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

## Invite

## Stream

## Subscription

## User
