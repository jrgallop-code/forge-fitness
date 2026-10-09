import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
test('recommended workout cards render with default art or source thumbnails without throwing',()=>{
 const source=readFileSync(new URL('../js/workouts/workout-landing-live.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function renderRecommendedCard('),source.indexOf('\nfunction renderPlanRow('));
 const context={planStats:()=>({days:3}),getPlanArtwork:()=>({family:'gym',src:'default.jpg'}),routineVideoThumbnail:plan=>plan.cover||'',escapeHtml:String,shortDescription:String,shortLevel:String,calendarIcon:()=>'',barsIcon:()=>''};
 vm.createContext(context);vm.runInContext(fn,context);
 assert.match(context.renderRecommendedCard({id:'regular',name:'Regular',description:'Workout',level:'Beginner'},0),/src="default.jpg"/);
 assert.match(context.renderRecommendedCard({id:'video',name:'Video',cover:'data:image/png;base64,YQ=='},1),/src="data:image\/png;base64,YQ=="/);
});
