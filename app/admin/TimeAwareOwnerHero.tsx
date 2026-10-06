"use client";
import {useEffect,useMemo,useState} from "react";

type DayState="morning"|"afternoon"|"evening"|"late";
function dayState(hour:number):DayState{
 if(hour>=5&&hour<12)return "morning";
 if(hour>=12&&hour<17)return "afternoon";
 if(hour>=17)return "evening";
 return "late";
}
function copyFor(state:DayState,selectedBrand:boolean){
 if(state==="morning")return {greeting:"Good morning",lead:selectedBrand?"This brand is in motion.":"Your world is in motion."};
 if(state==="afternoon")return {greeting:"Good afternoon",lead:selectedBrand?"Here’s where this brand stands this afternoon.":"Here’s where your world stands this afternoon."};
 if(state==="evening")return {greeting:"Good evening",lead:selectedBrand?"Here’s where this brand stands tonight.":"Here’s where your world stands tonight."};
 return {greeting:"Welcome back",lead:selectedBrand?"A clear view of what matters for this brand right now.":"A clear view of what matters right now."};
}
const imageFor:Record<DayState,string>={
 morning:"/owner-wallpapers/morning.webp",
 afternoon:"/owner-wallpapers/afternoon.webp",
 evening:"/owner-wallpapers/evening.webp",
 late:"/owner-wallpapers/late.webp"
};

export default function TimeAwareOwnerHero({name,selectedBrand}:{name:string;selectedBrand:boolean}){
 const [state,setState]=useState<DayState>("morning");
 useEffect(()=>{
  const update=()=>setState(dayState(new Date().getHours()));
  update();
  const timer=window.setInterval(update,60_000);
  return()=>window.clearInterval(timer);
 },[]);
 const copy=useMemo(()=>copyFor(state,selectedBrand),[state,selectedBrand]);
 return <>
  <div className="ownerHeroCopy">
   <p className="ownerKicker">WGOS · {selectedBrand?"BRAND COMMAND":"OWNER COMMAND"}</p>
   <h1>{copy.greeting},<br/>{name}.</h1>
   <p className="ownerLead">{copy.lead}<br/>Purpose, people, opportunities and delivery in one calm command surface.</p>
   <blockquote>“A bigger tomorrow<br/>for more people through music.”</blockquote>
  </div>
  <div className={"ownerHeroScene ownerHeroWallpaper "+state} aria-hidden="true">
   <img key={state} src={imageFor[state]} alt="" className="ownerWallpaperImage"/>
   <div className="ownerWallpaperShade"/>
  </div>
 </>;
}
