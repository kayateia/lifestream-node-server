#!/bin/bash

dir=sample-images
width=800
height=600

if [ -d $dir ]; then
	echo "$0: $dir directory already exists"
	exit 1
fi

mkdir "$dir"

for i in deciare alice bob carol dave; do
	for j in {1..10}; do
		curl http://lorempizza.com/$width/$height -o "$dir/$i-landscape-$j.jpg"
		curl http://lorempizza.com/$height/$width -o "$dir/$i-portrait-$j.jpg"
	done
done
