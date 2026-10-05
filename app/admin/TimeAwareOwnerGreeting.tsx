"use client";
import {useEffect,useState} from "react";

function timeCopy(hour:number,selectedBrand:boolean){
 if(hour>=5&&hour<12)return {
  greeting:"Good morning",
  lead:selectedBrand?"This brand is in motion.":"Your world is in motion."
 };
 if(hour>=12&&hour<17)return {
  greeting:"Good afternoon",
  lead:selectedBrand?"Here’s where this brand stands this afternoon.":"Here’s where your world stands this afternoon."
 };
 if(hour>=17)return {
  greeting:"Good evening",
  lead:selectedBrand?"Here’s where this brand stands tonight.":"Here’s where your world stands tonight."
 };
 return {
  greeting:"Welcome back",
  lead:selectedBrand?"A clear view of what matters for this brand right now.":"A clear view of what matters right now."
 };
}

export default function TimeAwareOwnerGreeting({name,selectedBrand}:{name:string;selectedBrand:boolean}){
 const [copy,setCopy]=useState(()=>({greeting:"Welcome",lead:selectedBrand?"This brand is in motion.":"Your world is in motion."}));
 useEffect(()=>{
  const update=()=>setCopy(timeCopy(new Date().getHours(),selectedBrand));
  update();
  const timer=window.setInterval(update,60_000);
  return()=>window.clearInterval(timer);
 },[selectedBrand]);
 return <>
  <h1>{copy.greeting},<br/>{name}.</h1>
  <p className="ownerLead">{copy.lead}<br/>Purpose, people, opportunities and delivery in one calm command surface.</p>
 </>;
}
