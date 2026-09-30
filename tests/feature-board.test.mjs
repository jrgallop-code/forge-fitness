import test from 'node:test';
import assert from 'node:assert/strict';
import {featureBoard} from '../cloud/src/feature-board.js';
const user={id:'owner'};
function env(row){return {DB:{prepare(){return {bind(){return this;},async first(){return row;},async run(){throw Error('Unauthorized write');}};}}};}
const request=(path,method='GET')=>new Request('https://api.leveluphypertrophy.com/v1/features'+path,{method});
test('guest cannot submit',async()=>assert.equal((await featureBoard(request('','POST'),env(),null,false,async()=>({}))).status,401));
test('private request is invisible to another member',async()=>assert.equal((await featureBoard(request('/id/comments'),env({user_id:'someone',published:0}),user,false)).status,404));
test('members cannot publish requests',async()=>assert.equal((await featureBoard(request('/id','PATCH'),env({user_id:'owner',published:0}),user,false)).status,403));
test('pending requests cannot receive votes',async()=>assert.equal((await featureBoard(request('/id/vote','PUT'),env({user_id:'owner',published:0}),user,false)).status,403));
