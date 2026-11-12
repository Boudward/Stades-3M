/* STADES 3M – application – version 4.1.0 */
const INVITE=/type=(invite|recovery)/.test(location.hash); // lien d'invitation reçu par e-mail
const ENVS = window.STADES_ENVS, TITRE0 = document.title;
function envDuLien(){ // lien d'invitation ou de réinitialisation : la base est déduite de l'émetteur du jeton
 try{const t=(location.hash.match(/access_token=([^&]+)/)||[])[1];if(!t)return null;const p=JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));for(const k in ENVS)if(p.iss&&p.iss.indexOf(new URL(ENVS[k].url).host)>=0)return k}catch(e){}return null}
let ENV = envDuLien() || sessionStorage.getItem("stades_env") || "prod";if(!ENVS[ENV])ENV="prod";
let sb = supabase.createClient(ENVS[ENV].url, ENVS[ENV].key);
function appliquerEnv(){sessionStorage.setItem("stades_env",ENV);const t=ENV==="test";document.getElementById("envb").classList.toggle("hide",!t);document.title=(t?"[TEST] ":"")+TITRE0}
const $ = id => document.getElementById(id);
const ST = {nouvelle:"Nouveau",en_cours:"En cours",en_attente:"En attente",resolue:"Résolu",refusee:"Refusé",archivee:"Archivé"};
const PR = {basse:"Basse",normale:"Normale",haute:"Haute",urgente:"Urgente"};
const ROLES = {demandeur:"Demandeur",responsable:"Responsable",supervision:"Supervision",agent_travaux:"Agent bâtiment",agent_exploitation:"Agent exploitation",admin:"Admin"};
let me, sites=[], trib=[], tk=[], cur, signup=false, view="";
const esc = s => String(s??"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const opts = (o,all)=>(all?`<option value="">${all}</option>`:"")+Object.entries(o).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
const sOpts = (all)=>(all?`<option value="">${all}</option>`:"")+sites.filter(s=>s.actif!==false).map(s=>`<option value="${s.id}">${esc(s.nom)}</option>`).join("");
const tOpts = (sid,all)=>(all?`<option value="">${all}</option>`:"")+trib.filter(t=>t.actif!==false&&(!sid||t.site_id==sid)).map(t=>`<option value="${t.id}">${esc(t.nom)}</option>`).join("");
const siteN = id=>(sites.find(s=>s.id==id)||{}).nom||"?", tribN = id=>(trib.find(t=>t.id==id)||{}).nom||"?";
const role = ()=> me.role==="admin" && view ? view : me.role;
$("np").innerHTML=opts(PR); $("np").value="normale";
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("tog").onclick=()=>{signup=!signup;$("pwb").classList.toggle("hide",signup);$("lmsg").style.color="";$("sg").classList.toggle("hide",!signup);$("lt").textContent=signup?"Demande de création de compte":"Connexion";
 $("go").textContent=signup?"Envoyer la demande":"Se connecter";$("tog").textContent=signup?"J'ai déjà un compte":"Demander un compte";$("lmsg").textContent=""};
$("go").onclick=async()=>{$("lmsg").style.color="";
 const email=$("em").value,password=$("pw").value;
 if(signup){
  if(![$("sn"),$("sp"),$("ss"),$("sf"),$("em")].every(i=>i.value.trim())){$("lmsg").textContent="Renseignez tous les champs.";return}
  const {error}=await sb.from("demandes_compte").insert({nom:$("sn").value.trim(),prenom:$("sp").value.trim(),societe:$("ss").value.trim(),fonction:$("sf").value.trim(),email:email.trim()});
  if(error){$("lmsg").textContent="Demande impossible : "+errMsg(error);return}
  $("lmsg").style.color="var(--ok)";$("lmsg").textContent="Demande envoyée. L'administrateur l'examinera puis vous invitera par e-mail à choisir votre mot de passe.";return}
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error)$("lmsg").textContent=/fetch|network|NetworkError/i.test(error.message||"")?"Connexion au serveur impossible : vérifiez votre réseau et que le projet Supabase est actif.":"Connexion impossible : vérifiez l'e-mail et le mot de passe.";else start()};
$("out").onclick=async()=>{await sb.auth.signOut();location.reload()};


const ERRS={interv_bc_coherent:"Renseignez d'abord le numéro de bon de commande.",interv_facture_coherent:"La facture ne peut pas être « payée » sans être « reçue ».",interv_bc_longueur:"Le numéro de bon de commande doit comporter au moins 12 caractères.",interv_devis_coherent:"La date de réception du devis précède celle de la demande."};
function errMsg(e){const m=(e&&e.message)||String(e);if(/Could not find the '[^']+' column|schema cache/i.test(m))return "La base de données n'est pas à jour : exécutez la dernière migration SQL.";if(/JWT expired|invalid JWT/i.test(m))return "Votre session a expiré : reconnectez-vous.";for(const k in ERRS)if(m.includes(k))return ERRS[k];
 if(e.code==="23505")return "Cet élément existe déjà.";if(e.code==="23503")return "Cet élément est utilisé ailleurs : suppression impossible.";
 if(e.code==="42501"||/row-level security|permission denied/i.test(m))return "Action non autorisée pour votre profil.";if(/Failed to fetch|NetworkError/i.test(m))return "Connexion impossible : vérifiez votre réseau.";return m}
async function allRows(t){let r=[];for(let i=0;;i+=1000){const {data,error}=await sb.from(t).select("*").order("created_at",{ascending:false}).order("id",{ascending:false}).range(i,i+999);if(error)return{error};r=r.concat(data);if(data.length<1000)return{data:r}}}
let MM={};
const MB="Bonjour,\n\n{INTRO}\nObjet : {titre}\nConsignes : {consignes}\nLieu : {site}\nZone : {zone}\nLocal : {local}\nCorps d'état : {corps_etat}\nPriorité : {priorite}\nDate d'intervention : {echeance}\nDurée estimée : {duree}\n";
const MD={regie:{objet:"{SITE} - Intervention {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous confions l'intervention ci-dessous :")+"\n(Fiche d'intervention à joindre : bouton « Fiche PDF »)\n\nCordialement,\n{signataire}"},
 entreprise:{objet:"{SITE} - Intervention {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous confions l'intervention ci-dessous :")+"\nCordialement,\n{signataire}"},
 devis:{objet:"{SITE} - Demande de devis {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous remercions de nous adresser un devis pour l'intervention ci-dessous :")+"\nCordialement,\n{signataire}"}};
const MLAB={regie:"Régie – envoi aux agents",entreprise:"Entreprise – envoi de l'intervention",devis:"Entreprise – demande de devis"},mdl=k=>MM[k]||MD[k];
function fill(t,v){return t.split("\n").map(l=>{let h=0,f=0;const r=l.replace(/\{(\w+)\}/g,(_,n)=>{h=1;const x=v[n]||"";if(x)f=1;return x});return h&&!f?null:r}).filter(l=>l!==null).join("\r\n")}
function renderMM(){$("mmods").innerHTML=Object.keys(MLAB).filter(k=>FINANCES||k!=="devis").map(k=>{const m=mdl(k);return `<h4 style="margin:16px 0 0">${MLAB[k]}</h4><label>Objet</label><input data-mm="${k}" data-f="objet" value="${esc(m.objet)}"><label>Corps du message</label><textarea data-mm="${k}" data-f="corps" rows="10">${esc(m.corps)}</textarea><div class="row" style="margin-top:8px"><button data-k="${k}">Enregistrer</button><button class="sec" data-r="${k}">Rétablir le modèle d'origine</button></div>`}).join("")+`<p class="msg">Variables : {ref} {titre} {consignes} {site} {SITE} {zone} {local} {corps_etat} {priorite} {echeance} {signataire}. Une ligne dont toutes les variables sont vides est supprimée automatiquement.</p>`}
$("mmods").onclick=async e=>{const b=e.target.closest("button");if(!b)return;const k=b.dataset.k||b.dataset.r,q=f=>document.querySelector(`[data-mm="${k}"][data-f="${f}"]`).value;
 const row=b.dataset.k?{cle:k,objet:q("objet"),corps:q("corps")}:{cle:k,...MD[k]};if(!row.objet.trim()||!row.corps.trim()){$("mmmsg").style.color="";$("mmmsg").textContent="L'objet et le corps sont obligatoires.";return}
 const {error}=await sb.from("modeles_mail").upsert({...row,updated_at:new Date().toISOString()});$("mmmsg").style.color=error?"":"var(--ok)";$("mmmsg").textContent=error?errMsg(error):"Modèle enregistré.";if(!error){MM[k]=row;renderMM()}};
const IC=(a,i,t)=>{const m={e:["✎","Renommer"],x:["✕","Supprimer"],r:["↺","Réactiver"]}[a];return `<button class="ic" title="${m[1]}" aria-label="${m[1]}" data-a="${a}" data-t="${t}" data-i="${i}">${m[0]}</button>`};
function renderGrids(){const row=(t,x,d)=>`<div class="gr${x.actif===false?" off":""}"><span>${esc(x.nom)}</span><span>${t==="corps_etat"?refSel(x,d):""}${x.actif===false?IC("r",x.id,t):IC("e",x.id,t)}${IC("x",x.id,t)}</span></div>`,
 add=(ph,t,p)=>`<div class="gadd"><input placeholder="${ph}" data-n aria-label="${ph}"><button data-add="${t}" data-p="${p}" aria-label="${ph}">+</button></div>`;
 $("clists").innerHTML=`<div class="grid" style="grid-template-columns:repeat(${cats.length||1},minmax(0,1fr))">`+cats.map(c=>`<div class="gc"><h4>${esc(c.nom)}</h4>${corps.filter(x=>x.categorie_id===c.id).map(x=>row("corps_etat",x,c.domaine)).join("")}${add("Nouveau lot","corps_etat",c.id)}</div>`).join("")+`</div>`;
 $("lists").innerHTML=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">`+sites.map(s=>`<div class="gc"><h4><span>${esc(s.nom)}${s.actif===false?" (désactivé)":""}</span><span>${s.actif===false?IC("r",s.id,"sites"):IC("e",s.id,"sites")}${IC("x",s.id,"sites")}</span></h4>${trib.filter(t=>t.site_id===s.id).map(t=>row("tribunes",t)).join("")}${add("Nouvelle zone/tribune","tribunes",s.id)}</div>`).join("")+`</div>`}
async function gridClick(e){const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.add){const n=b.previousElementSibling.value.trim();if(n)adm(sb.from(d.add).insert({[d.add==="corps_etat"?"categorie_id":"site_id"]:+d.p,nom:n}));return}
 if(d.a==="e"){const o=(d.t==="sites"?sites:d.t==="tribunes"?trib:corps).find(x=>x.id==d.i),n=(prompt("Nouveau nom :",o.nom)||"").trim();if(n&&n!==o.nom)adm(sb.from(d.t).update({nom:n}).eq("id",d.i))}
 else if(d.a==="r")adm(sb.from(d.t).update({actif:true}).eq("id",d.i));
 else if(d.a==="x"){if(!confirm("Supprimer cet élément ?"))return;const {error}=await sb.from(d.t).delete().eq("id",d.i);
  if(error&&error.code==="23503"){if(confirm("Cet élément est utilisé par des tickets ou des interventions : il ne peut pas être supprimé.\nLe désactiver à la place (il disparaîtra des listes de choix) ?"))adm(sb.from(d.t).update({actif:false}).eq("id",d.i));return}
  adm(Promise.resolve({error}))}}
$("clists").onclick=$("lists").onclick=gridClick;
$("clists").onchange=e=>{const t=e.target;if(t.dataset.ref)adm(sb.from("corps_etat").update({referent_id:t.value||null}).eq("id",t.dataset.ref))};
$("ad").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.dataset.n!==undefined){e.preventDefault();e.target.nextElementSibling.click()}});
$("dPw").addEventListener("cancel",e=>e.preventDefault());
sb.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT"&&me)location.reload()});
$("fgt").onclick=async()=>{const m=$("em").value.trim();$("lmsg").style.color="";if(!m){$("lmsg").textContent="Saisissez d'abord votre adresse e-mail.";return}
 const {error}=await sb.auth.resetPasswordForEmail(m,{redirectTo:location.origin+location.pathname});$("lmsg").style.color=error?"":"var(--ok)";$("lmsg").textContent=error?errMsg(error):"Si cette adresse correspond à un compte, un lien de réinitialisation vient d'être envoyé."};

let NT=[],dtm;
async function loadNot(){const {data,error}=await sb.from("notifications").select("*").order("created_at",{ascending:false}).limit(50);if(error)return;NT=data;const n=NT.filter(x=>!x.lu).length;$("bn").textContent=n>99?"99+":n;$("bn").classList.toggle("hide",!n)}
function drawNot(){$("dNb").innerHTML=NT.map(x=>`<div class="tl${x.lu?"":" nt"}" data-n="${x.id}" data-t="${x.ticket_id||""}" data-i="${x.intervention_id||""}" style="cursor:pointer"><span>${tlTime(x.created_at)}</span><b>${esc(x.titre)}</b>${x.message?" – "+esc(x.message):""}</div>`).join("")||`<p class="empty" style="padding:8px">Aucune notification.</p>`}
$("bell").onclick=()=>{drawNot();$("dNot").showModal()};
$("dNa").onclick=async()=>{await sb.rpc("notif_lire");await loadNot();drawNot()};
$("dNb").onclick=e=>{const r=e.target.closest("[data-n]");if(!r)return;const d=r.dataset;sb.rpc("notif_lire",{p_id:+d.n}).then(loadNot);$("dNot").close();
 const i=d.i&&ints.find(x=>x.id==d.i),t=d.t&&tk.find(x=>x.id==d.t);if(i)openIv(i);else if(t)openDet(t.id)};
const dirty=()=>{clearTimeout(dtm);dtm=setTimeout(()=>{if(!document.querySelector("dialog[open]"))load()},1500)};
function live(){setInterval(loadNot,60000);setInterval(sugAlert,60000);sugAlert();sb.channel("stades").on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${me.id}`},()=>{loadNot();dirty()})
 .on("postgres_changes",{event:"*",schema:"public",table:"tickets"},dirty).on("postgres_changes",{event:"*",schema:"public",table:"interventions"},dirty).subscribe()}
const AL={titre:"Titre",consignes:"Consignes",priorite:"Priorité",echeance:"Date d'intervention",duree_h:"Durée",etat:"État",local:"Local",site_id:"Site",tribune_id:"Zone",agent_ids:"Intervenants",entreprise_id:"Entreprise",prestataire:"Prestataire",prestataire_email:"E-mail entreprise",devis_demande_at:"Devis demandé",devis_recu_at:"Devis reçu",bc_numero:"N° bon de commande",bc_envoye_at:"BC envoyé",facture_recue:"Facture reçue",facture_payee:"Facture payée",montant_devis_ht:"Devis HT",montant_bc_ht:"BC HT",montant_facture_ht:"Facture HT"};
const vv=(k,v)=>v==null||v===""?"—":k==="etat"?ET[v]||v:k==="priorite"?PR[v]||v:k==="duree_h"?fduree(v):/_at$|echeance/.test(k)?fdate(v):k.startsWith("montant")?eur(v):k==="entreprise_id"?((ents.find(e=>e.id==v)||{}).entreprise||"?"):k==="site_id"?siteN(v):k==="tribune_id"?tribN(v):k==="agent_ids"?(v.map(i=>{const p=agents.find(a=>a.id===i);return p?(p.prenom+" "+p.nom).trim():"?"}).join(", ")||"—"):String(v);
async function loadH(){const {data}=await sb.from("audit_log").select("*").eq("table_name","interventions").eq("num_id",curI.id).order("created_at",{ascending:false}).limit(60);if(!$("ih"))return;
 $("ih").innerHTML=(data||[]).map(a=>{const ch=a.action==="MAIL"?["Envoi d'e-mail à "+((a.changes||{}).destinataires||"—")+" – « "+((a.changes||{}).objet||"")+" »"]:a.action==="INSERT"?["Intervention créée"]:Object.entries(a.changes||{}).filter(([k])=>AL[k]).map(([k,v])=>`${AL[k]} : ${vv(k,v[0])} → ${vv(k,v[1])}`);
  return ch.length?`<div class="tl"><span>${tlTime(a.created_at)}</span><b>${esc(a.par_nom||"Système")}</b> : ${esc(ch.join(" ; "))}</div>`:""}).join("")||`<p class="empty" style="padding:8px">Aucune modification enregistrée.</p>`}

async function renderAff(){const [a,p]=await Promise.all([sb.from("affectations").select("*"),sb.from("profiles").select("id,prenom,nom,role").eq("actif",true).in("role",["admin","responsable"])]);
 const A=a.data||[],Pf=p.data||[];
 RF=Pf;renderGrids();$("affb").innerHTML=`<table><thead><tr><th>Site</th><th>Responsable désigné pour ce site</th></tr></thead><tbody>`+sites.filter(s=>s.actif!==false).map(s=>{const c=(A.find(x=>x.site_id===s.id)||{}).profile_id;return `<tr><td>${esc(s.nom)}</td><td><select data-s="${s.id}" aria-label="Responsable – ${esc(s.nom)}"><option value="">— Aucun (référent du corps d'état) —</option>${Pf.map(x=>`<option value="${x.id}"${x.id===c?" selected":""}>${esc((x.prenom+" "+x.nom).trim())}</option>`).join("")}</select></td></tr>`}).join("")+`</tbody></table>`}
$("affb").onchange=e=>{const t=e.target,s=+t.dataset.s;adm(t.value?sb.from("affectations").upsert({site_id:s,profile_id:t.value}):sb.from("affectations").delete().eq("site_id",s))};
const LB={...AL,role:"Rôle",actif:"Actif",nom:"Nom",prenom:"Prénom",email:"E-mail",societe:"Société",fonction:"Fonction",entreprise:"Entreprise",contact:"Contact",mobile:"Mobile",profile_id:"Responsable",referent_id:"Référent",domaine:"Domaine",site_defaut_id:"Site par défaut",ref:"N°"};
const av=(k,v)=>k==="role"?(ROLES[v]||v||"—"):k==="actif"?(v?"oui":"non"):(k==="profile_id"||k==="referent_id")?((p=>p?(p.prenom+" "+p.nom).trim():"?")(agents.find(a=>a.id===v))):k==="site_defaut_id"?(v?siteN(v):"—"):typeof v==="object"&&v!==null?"…":vv(k,v);
async function renderAud(){let q=sb.from("audit_log").select("*").order("created_at",{ascending:false}).limit(150);if($("afl").value)q=q.eq("table_name",$("afl").value);const {data,error}=await q;
 if(error){$("arows").innerHTML=`<tr><td colspan="5">${esc(errMsg(error))}</td></tr>`;return}
 const TN={interventions:"Intervention",profiles:"Utilisateur",entreprises:"Entreprise",affectations:"Affectation",corps_etat:"Corps d'état"},AC={INSERT:"Création",UPDATE:"Modification",DELETE:"Suppression",MAIL:"E-mail"},HID=["id","created_at","updated_at","prefs","terminee_at","cree_par","agents_noms"];
 $("arows").innerHTML=(data||[]).map(a=>{const c=a.changes||{},d=a.action==="UPDATE"?Object.entries(c).map(([k,v])=>`${LB[k]||k} : ${av(k,v[0])} → ${av(k,v[1])}`):Object.entries(c).filter(([k,v])=>v!=null&&v!==""&&!HID.includes(k)).slice(0,5).map(([k,v])=>`${LB[k]||k} : ${av(k,v)}`);
  return `<tr><td>${tlTime(a.created_at)}</td><td>${esc(a.par_nom||"Système")}</td><td>${TN[a.table_name]||esc(a.table_name)}${a.table_name==="interventions"?" n°"+esc(a.row_id):""}</td><td>${AC[a.action]||a.action}</td><td>${esc(d.join(" ; ").slice(0,240))}</td></tr>`}).join("")||`<tr><td colspan="5" class="empty">Aucune entrée.</td></tr>`}
$("afl").onchange=$("abtn").onclick=renderAud;$("adet").addEventListener("toggle",()=>{if($("adet").open)renderAud()});
let DP="all";
const SC={nouvelle:"#102d69",en_cours:"#3b82c4",en_attente:"#c8641b",resolue:"#2e8b3c",refusee:"#b3261e",archivee:"#8a99a3"},EC={planifiee:"#3b82c4",en_attente_pieces:"#c8641b",en_cours:"#102d69",terminee:"#2e8b3c",annulee:"#8a99a3"};
const dDeb=()=>{if(DP==="year")return new Date().getFullYear()+"-01-01";if(DP==="30"){const d=new Date();d.setDate(d.getDate()-30);return d.toLocaleDateString("sv-SE")}return null};
function donut(items){const tot=items.reduce((a,x)=>a+x.v,0);if(!tot)return '<p class="empty">Aucune donnée.</p>';let off=0;
 const arcs=items.filter(x=>x.v).map(x=>{const p=x.v/tot*100,s=`<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${x.c}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${25-off}"><title>${esc(x.l)} : ${x.v}</title></circle>`;off+=p;return s}).join("");
 return `<div class="row" style="align-items:center;flex-wrap:nowrap"><svg viewBox="0 0 42 42" width="130" height="130" role="img" aria-label="Répartition">${arcs}<text x="21" y="22.6" text-anchor="middle" font-size="7" font-weight="700" fill="#1c2b33">${tot}</text></svg><div style="font-size:13px">${items.map(x=>`<div><span style="display:inline-block;width:10px;height:10px;background:${x.c};margin-right:6px"></span>${esc(x.l)} : <b>${x.v}</b></div>`).join("")}</div></div>`}
const bars=(items,col)=>{const mx=Math.max(1,...items.map(x=>x.v));return items.length?items.map(x=>`<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(x.l)}</span><b>${x.v}</b></div><div style="background:#e8ecf3;border-radius:4px;height:10px"><div style="width:${x.v/mx*100}%;background:${col};height:10px;border-radius:4px"></div></div></div>`).join(""):'<p class="empty">Aucune donnée.</p>'};
function cols(S){if(!S.length)return '<p class="empty">Aucune donnée.</p>';const W=600,H=170,L=28,B=22,n=S.length,mx=Math.max(1,...S.flatMap(x=>[x.crees,x.resolus])),bw=(W-L)/n,y=v=>H-B-v/mx*(H-B-12),day=n>14;
 const lab=x=>{const d=new Date(x.d+"T00:00:00");return day?d.getDate():d.toLocaleDateString("fr-FR",{month:"short"})};
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Évolution dans le temps"><line x1="${L}" y1="${H-B}" x2="${W}" y2="${H-B}" stroke="#d3d9e6"/><text x="0" y="12" font-size="10" fill="#5d6e77">${mx}</text>`+S.map((x,i)=>{const X=L+i*bw,w=Math.max(2,bw*.38);
  return `<rect x="${X+bw*.1}" y="${y(x.crees)}" width="${w}" height="${H-B-y(x.crees)}" fill="#102d69"><title>${x.crees} créé(s)</title></rect><rect x="${X+bw*.1+w+1}" y="${y(x.resolus)}" width="${w}" height="${H-B-y(x.resolus)}" fill="#2e8b3c"><title>${x.resolus} résolu(s)</title></rect>${(!day||i%5===0)?`<text x="${X+bw/2}" y="${H-6}" font-size="9" text-anchor="middle" fill="#5d6e77">${lab(x)}</text>`:""}`}).join("")+`</svg><div class="meta"><span style="color:#102d69">■</span> créés &nbsp; <span style="color:#2e8b3c">■</span> résolus</div>`}
const setP=()=>[...$("dper").children].forEach(b=>b.classList.toggle("sec",b.dataset.p!==DP));
async function loadDash(){$("dDb").innerHTML='<p class="empty">Chargement…</p>';const {data:d,error}=await sb.rpc("stats_tableau_bord",{p_debut:dDeb()});
 if(error){$("dDb").textContent=errMsg(error)+" (la migration SQL du tableau de bord est peut-être à exécuter)";return}
 const T=d.tickets_par_statut||{},I=d.interventions_par_etat||{},tile=(n,l,w)=>`<div class="gc" style="padding:10px;text-align:center${w?";border-color:var(--warn)":""}"><div style="font-size:26px;font-weight:700;color:${w?"var(--warn)":"var(--accent)"}">${n??"—"}</div><div class="meta">${l}</div></div>`,box=(t,b,full)=>`<div class="gc"${full?' style="grid-column:1/-1"':""}><h4>${t}</h4><div style="padding:10px">${b}</div></div>`,
 g=(m,x)=>`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(${m}px,1fr));margin-top:${x}px">`;
 $("dDb").innerHTML=`${g(130,0)}${tile(d.tickets_total,"Tickets")}${tile(d.tickets_en_retard,"Tickets en retard",d.tickets_en_retard>0)}${tile(d.delai_moyen_jours==null?"—":d.delai_moyen_jours+" j","Délai moyen de résolution")}${tile(d.interventions_total,"Interventions")}${tile(d.interventions_en_retard,"Interventions en retard",d.interventions_en_retard>0)}</div>
 ${g(320,14)}${box("Tickets par statut",donut(Object.keys(ST).map(k=>({l:ST[k],v:T[k]||0,c:SC[k]}))))}${box("Interventions par état",donut(Object.keys(ET).map(k=>({l:ET[k],v:I[k]||0,c:EC[k]}))))}${box("Tickets par catégorie",bars((d.tickets_par_categorie||[]).map(x=>({l:x.nom,v:x.n})),"#102d69"))}${box("Tickets par site",bars((d.tickets_par_site||[]).map(x=>({l:x.nom,v:x.n})),"#3b82c4"))}${box("Évolution des tickets "+(d.serie_unite==="day"?"(par jour)":DP==="all"?"(par mois, 12 derniers mois)":"(par mois)"),cols(d.serie||[]),true)}</div>`}
$("dash").onclick=()=>{$("dDash").showModal();setP();loadDash()};
$("dper").onclick=e=>{const b=e.target.closest("button");if(!b)return;DP=b.dataset.p;setP();loadDash()};

const dl=(o,n)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:"application/json"}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4e3)};
async function tbl(t,ord){let r=[];for(let i=0;;i+=1000){const {data,error}=await sb.from(t).select("*").order(ord).range(i,i+999);if(error)throw error;r=r.concat(data);if(data.length<1000)return r}}
const TBK=["sites","tribunes","categories","corps_etat","entreprises","affectations","modeles_mail","profiles","tickets","ticket_suivi","ticket_events","interventions","intervention_notes","suggestions","demandes_compte","audit_log","plans_preventifs"],OB={affectations:"site_id",modeles_mail:"cle"};
async function renderVol(){const {data,error}=await sb.rpc("donnees_volumes");if(error){$("dvol").textContent=errMsg(error);return}const mo=n=>(n/1048576).toFixed(1)+" Mo";
 $("dvol").innerHTML=`<p>Taille de la base : <b>${mo(data.base_octets)}</b> (à comparer à la limite de votre offre Supabase). Plus grosses tables : ${data.tables.slice(0,5).map(t=>`${esc(t.table)} ${mo(t.octets)}`).join(" · ")}.</p>`}
$("ddet").addEventListener("toggle",()=>{if($("ddet").open)renderVol()});
$("bkp").onclick=async()=>{const m=$("dmsg");m.style.color="";try{const o={application:"STADES 3M",type:"sauvegarde",version:"4.1.0",date:new Date().toISOString(),tables:{}};for(const t of TBK){m.textContent="Export : "+t+"…";o.tables[t]=await tbl(t,OB[t]||"id")}
 dl(o,`stades3m_sauvegarde_${today()}.json`);m.style.color="var(--ok)";m.textContent="Sauvegarde téléchargée : conservez le fichier en lieu sûr (il contient des données personnelles)."}catch(e){m.textContent=errMsg(e)}};
let CAND=null;
$("acand").onclick=async()=>{$("dmsg").textContent="";const {data,error}=await sb.rpc("archive_candidats",{p_mois_tickets:+$("amt").value,p_mois_audit:+$("ama").value});if(error){$("dmsg").style.color="";$("dmsg").textContent=errMsg(error);return}
 CAND=data;$("acs").textContent=`${data.tickets_total} ticket(s) et ${data.audit_total} ligne(s) d'audit concernés. Lot proposé : ${data.tickets.length} ticket(s), ${data.interventions.length} intervention(s), ${data.audit.length} ligne(s) d'audit.`;$("apur").classList.toggle("hide",!(data.tickets.length||data.interventions.length||data.audit.length))};
$("apur").onclick=async()=>{const c=CAND,m=$("dmsg");if(!c||!confirm("Télécharger l'archive puis SUPPRIMER DÉFINITIVEMENT ce lot de la base ?"))return;m.style.color="";try{
 const ch=a=>{const r=[];for(let i=0;i<a.length;i+=100)r.push(a.slice(i,i+100));return r},get=async(t,col,ids)=>(await Promise.all(ch(ids).map(x=>sb.from(t).select("*").in(col,x).then(r=>{if(r.error)throw r.error;return r.data})))).flat();
 m.textContent="Préparation de l'archive…";
 const o={application:"STADES 3M",type:"archive",date:new Date().toISOString(),tickets:await get("tickets","id",c.tickets),ticket_suivi:await get("ticket_suivi","ticket_id",c.tickets),ticket_events:await get("ticket_events","ticket_id",c.tickets),interventions:await get("interventions","id",c.interventions),intervention_notes:await get("intervention_notes","intervention_id",c.interventions),audit_log:await get("audit_log","id",c.audit)};
 if(o.tickets.length!==c.tickets.length||o.interventions.length!==c.interventions.length||o.audit_log.length!==c.audit.length)throw new Error("Export incomplet : suppression annulée.");
 dl(o,`stades3m_archive_${today()}.json`);
 const {data,error}=await sb.rpc("archive_purger",{p_tickets:c.tickets,p_interventions:c.interventions,p_audit:c.audit,p_mois_tickets:+$("amt").value,p_mois_audit:+$("ama").value});if(error)throw error;
 CAND=null;$("apur").classList.add("hide");$("acs").textContent="";m.style.color="var(--ok)";m.textContent=`Supprimé : ${data.tickets} ticket(s), ${data.interventions} intervention(s), ${data.audit} ligne(s) d'audit. Relancez la recherche pour le lot suivant.`;renderVol();load()}catch(e){m.textContent=errMsg(e)}};

let RF=[],UL=[],UE=null;
const refSel=(x,d)=>`<select class="rf" data-ref="${x.id}" title="Référent par défaut" aria-label="Référent par défaut – ${esc(x.nom)}"><option value="">Référent : règle par défaut</option>${RF.filter(p=>p.role==="admin"||p.role==="responsable").map(p=>`<option value="${p.id}"${p.id===x.referent_id?" selected":""}>${esc((p.prenom+" "+p.nom).trim())}</option>`).join("")}</select>`;
function editU(id){const u=UL.find(x=>x.id===id);if(!u)return;UE=id;$("uem").textContent=u.email||"";["prenom","nom","societe","fonction"].forEach(k=>$("u_"+k).value=u[k]||"");
 $("u_role").innerHTML=O(Object.entries(ROLES),u.role);$("u_site").innerHTML=O([["","— Aucun —"],...sites.filter(x=>x.actif!==false||x.id===u.site_defaut_id).map(x=>[x.id,x.nom])],u.site_defaut_id);$("u_msg").textContent="";$("dUsr").showModal()}
$("u_ko").onclick=()=>$("dUsr").close();
$("u_ok").onclick=async()=>{const v=k=>$("u_"+k).value.trim();if(!v("nom")||!v("prenom")){$("u_msg").textContent="Le nom et le prénom sont obligatoires.";return}
 const {error}=await sb.from("profiles").update({prenom:v("prenom"),nom:v("nom"),societe:v("societe"),fonction:v("fonction"),role:$("u_role").value,site_defaut_id:$("u_site").value?+$("u_site").value:null}).eq("id",UE);
 if(error){$("u_msg").textContent=errMsg(error);return}$("dUsr").close();await load();loadAdmin()};

const VS=[{t:"Bienvenue dans STADES 3M",x:"Cette visite d'une minute présente les boutons principaux. Vous pouvez la passer et la revoir à tout moment avec le lien « Revoir la visite guidée » en bas de page."},
 {s:"new",t:"Nouveau ticket",x:"Signalez un problème ou un besoin : site, zone, catégorie, titre et description. Le ticket reçoit un numéro et une personne est chargée de le traiter."},
 {s:"tabs",t:"Tickets et interventions",x:"Les tickets sont les signalements ; les interventions sont les actions confiées à des agents ou à des entreprises."},
 {s:"newint",t:"Nouvelle intervention",x:"Confiez un travail à des agents ou à une entreprise, avec consignes, échéance et suivi (devis, bon de commande, facture)."},
 {s:"tabp",t:"Maintenance préventive",x:"Les contrôles périodiques (SSI, extincteurs, ascenseurs…) : échéances suivies et interventions créées automatiquement avant la date."},
 {s:"dash",t:"Tableau de bord",x:"Les chiffres clés : tickets par statut, retards, délai moyen de résolution et interventions."},
 {s:"colt",t:"Colonnes, tri et filtres",x:"Affichez ou masquez des colonnes. Dans les tableaux : cliquez sur le nom d'une colonne pour trier, sur ▾ pour filtrer, sur une ligne pour ouvrir la fiche. Ligne en gras = nouveau, en rouge = urgent."},
 {s:"coli",t:"Colonnes, tri et filtres",x:"Affichez ou masquez des colonnes. Cliquez sur le nom d'une colonne pour trier, sur ▾ pour filtrer, sur une ligne pour ouvrir l'intervention et changer son état."},
 {s:"bell",t:"Notifications",x:"Le compteur indique les nouveautés : ticket attribué, message, changement de statut, intervention. Cliquez sur une notification pour ouvrir l'élément concerné."},
 {s:"sug",t:"Idées et suggestions",x:"Proposez une amélioration ou signalez un problème à l'administrateur."},
 {s:"hlp",t:"Notice d'utilisation",x:"Ouvre la notice complète de votre profil."},
 {s:"adm",t:"Paramètres",x:"Annuaire des entreprises, corps d'état, sites et zones ; pour l'administrateur : comptes, référents, modèles d'e-mails, journal d'audit, sauvegardes."},
 {s:"tourb",t:"Visite guidée",x:"Relance cette visite à tout moment."},
 {s:"out",t:"Déconnexion",x:"Ferme votre session. Bon travail !"}];
let VL=[],VI=0;
function visite(){VL=VS.filter(x=>!x.s||($(x.s)&&$(x.s).offsetParent));VI=0;showV()}
function showV(){document.querySelectorAll(".tour-hl").forEach(e=>e.classList.remove("tour-hl"));const x=VL[VI];if(!x){$("tour").classList.add("hide");return}
 $("tt").textContent=x.t;$("tx").textContent=x.x;$("tn").textContent=`${VI+1} / ${VL.length}`;$("tp").disabled=VI===0;$("tnx").textContent=VI===VL.length-1?"Terminer":"Suivant";$("tour").classList.remove("hide");
 if(x.s){const e=$(x.s);e.classList.add("tour-hl");e.scrollIntoView({block:"nearest",behavior:"smooth"})}}
$("tnx").onclick=()=>{VI++;showV()};$("tp").onclick=()=>{VI--;showV()};$("tsk").onclick=()=>{VI=VL.length;showV()};$("tourl").onclick=e=>{e.preventDefault();visite()};$("tourb").onclick=visite;
$("dNew").addEventListener("cancel",e=>e.preventDefault());$("dIv").addEventListener("cancel",e=>{if(curI&&!curI.id)e.preventDefault()});
$("ibody").addEventListener("click",e=>{if(e.target.closest("[data-icancel]"))$("dIv").close()});

function colTools(tid,key){const t=$(tid),ths=[...t.querySelectorAll("thead th")],K="adm_"+key;let st={};try{st=JSON.parse(localStorage.getItem(K)||"{}")}catch(e){}st.w=st.w||{};st.h=st.h||[];
 const sty=document.createElement("style");document.head.appendChild(sty);
 const apply=()=>{sty.textContent=`#${tid}{table-layout:fixed;width:100%}`+ths.map((_,i)=>{const n=i+1;let r="";if(st.w[i])r+=`#${tid} th:nth-child(${n}){width:${st.w[i]}px}`;if(st.h.includes(i))r+=`#${tid} th:nth-child(${n}),#${tid} td:nth-child(${n}){display:none}`;return r}).join("");try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
 const lab=ths.map(th=>th.textContent.trim()||"Actions");
 ths.forEach((th,i)=>{th.style.position="relative";const g=document.createElement("span");g.className="rz";g.title="Glisser pour modifier la largeur";g.onmousedown=e=>{e.preventDefault();const x0=e.clientX,w0=th.offsetWidth,mv=ev=>{st.w[i]=Math.max(50,w0+ev.clientX-x0);apply()},up=()=>{document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up)};document.addEventListener("mousemove",mv);document.addEventListener("mouseup",up)};th.appendChild(g)});
 const b=document.createElement("button");b.className="sec sm";b.textContent="Colonnes";b.style.margin="0 0 0 auto";const pop=document.createElement("div");pop.className="panel hide";pop.style.cssText="margin:0 0 8px;padding:8px 12px";
 const fill=()=>{pop.innerHTML=lab.map((l,i)=>`<label style="display:inline-block;margin-right:14px"><input type="checkbox" data-c="${i}"${st.h.includes(i)?"":" checked"}> ${esc(l)}</label>`).join("")+`<button class="sec" data-r style="margin-left:6px">Réinitialiser</button>`};fill();
 pop.onchange=e=>{const i=+e.target.dataset.c;st.h=st.h.filter(x=>x!==i);if(!e.target.checked)st.h.push(i);apply()};
 pop.onclick=e=>{if(e.target.dataset.r!==undefined){st={w:{},h:[]};fill();apply()}};
 b.onclick=e=>{e.preventDefault();e.stopPropagation();pop.classList.toggle("hide")};const w=t.closest(".table")||t,sm=t.closest("details")&&t.closest("details").querySelector(":scope>summary");if(sm)sm.appendChild(b);else w.parentNode.insertBefore(b,w);w.parentNode.insertBefore(pop,w);apply()}
colTools("dtab","dem");colTools("utab","usr");colTools("atab","aud");
const ADM_KEY=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,ADM_BACK=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
let NEV=false;$("unev").onclick=()=>{NEV=!NEV;loadAdmin()};
$("dS").addEventListener("cancel",e=>e.preventDefault());

// ===== MAINTENANCE PRÉVENTIVE =====
let PL=[],PE=null;
const PM={1:"1 mois",2:"2 mois",3:"3 mois",4:"4 mois",6:"6 mois",12:"1 an",24:"2 ans",36:"3 ans",48:"4 ans",60:"5 ans"},canPl=()=>["admin","responsable"].includes(role());
function stPl(p){const d=today();if(!p.actif)return["pause","En pause"];if(p.prochaine_echeance<d)return["retard","En retard"];const l=new Date(p.prochaine_echeance+"T00:00:00");l.setDate(l.getDate()-p.prevenance_jours);return l.toLocaleDateString("sv-SE")<=d?["venir","À venir"]:["jour","À jour"]}
function renderPl(){const r=role(),inAdm=!$("ad").classList.contains("hide"),ok=["admin","responsable","supervision"].includes(r);
 $("tabp").classList.toggle("hide",!ok);$("tabp").classList.toggle("sec",tab!=="p");$("pv").classList.toggle("hide",inAdm||tab!=="p"||!ok);
 $("newpl").classList.toggle("hide",tab!=="p"||!canPl());$("genpl").classList.toggle("hide",tab!=="p"||!canPl());$("colp").classList.toggle("hide",tab!=="p"||!ok||inAdm);if(tab!=="p"||!ok)return;
 const f=$("pvf").value;TB.p.base=PL.filter(p=>!f||stPl(p)[0]===f);head("p");
 const rows=sortFilt(TB.p.base,"p"),ro=canPl()?"":" ro";
 $("prows").innerHTML=rows.map(p=>rowH("p",p,(stPl(p)[0]==="pause"?"pl-row-off":"")+ro,`data-pl="${p.id}"`)).join("")||`<tr><td colspan="${visCols("p").length}" class="empty">Aucun plan de maintenance.</td></tr>`}
const plAg=(cat,sel)=>{const d=(cats.find(c=>c.id==cat)||{}).domaine;return agents.filter(a=>a.role==="responsable"||(d&&dom(a.role)===d)).map(a=>`<label class="ck"><input type="checkbox" value="${a.id}"${(sel||[]).includes(a.id)?" checked":""}> ${esc((a.prenom+" "+a.nom).trim())}</label>`).join("")};
function openPl(p){PE=p?p.id:null;const v=p||{site_id:me.site_defaut_id&&sites.some(x=>x.id===me.site_defaut_id)?me.site_defaut_id:(sites.find(x=>x.actif!==false)||{}).id,categorie_id:(cats[0]||{}).id,periodicite_mois:12,prevenance_jours:30,priorite:"normale",actif:true,agent_ids:[]};
 $("dPlT").textContent=p?"Modifier le plan":"Nouveau plan de maintenance";$("pl_ti").value=v.titre||"";$("pl_s").innerHTML=sOpts();$("pl_s").value=v.site_id;$("pl_z").innerHTML=tOpts(v.site_id);if(v.tribune_id)$("pl_z").value=v.tribune_id;$("pl_l").value=v.local||"";
 $("pl_c").innerHTML=catsO(v.categorie_id);$("pl_k").innerHTML='<option value="">— Aucun —</option>'+corpsO(v.categorie_id,v.corps_etat_id);$("pl_tx").value=v.consignes||"";$("pl_m").innerHTML=O(Object.entries(PM),v.periodicite_mois);$("pl_d").value=v.prochaine_echeance||"";$("pl_j").value=v.prevenance_jours;$("pl_p").innerHTML=prioO(v.priorite);
 $("pl_e").innerHTML='<option value="">— Aucune (agents) —</option>'+O(ents.filter(e=>e.actif!==false).map(e=>[e.id,e.entreprise]),v.entreprise_id);$("pl_a").innerHTML=plAg(v.categorie_id,v.agent_ids);$("pl_x").checked=v.actif===false;$("dPl").classList.toggle("pl-off",$("pl_x").checked);$("pl_msg").textContent="";$("dPl").showModal()}
$("pvf").onchange=renderPl;$("newpl").onclick=()=>openPl(null);
$("genpl").onclick=async()=>{const {data,error}=await sb.rpc("preventif_generer");if(error){alert(errMsg(error));return}alert(data+" intervention(s) créée(s) pour les contrôles dont l'échéance approche.");await load()};
$("prows").onclick=async e=>{const b=e.target.closest("button");if(!b){const tr=e.target.closest("tr[data-pl]");if(tr&&canPl())openPl(PL.find(x=>x.id==tr.dataset.pl));return}if(b.dataset.pe)openPl(PL.find(x=>x.id==b.dataset.pe));else if(b.dataset.pd&&confirm("Supprimer ce plan ? Les interventions déjà créées sont conservées.")){const {error}=await sb.from("plans_preventifs").delete().eq("id",b.dataset.pd);if(error)alert(errMsg(error));await load()}};
$("pl_s").onchange=()=>{$("pl_z").innerHTML=tOpts($("pl_s").value)};
$("pl_c").onchange=()=>{$("pl_k").innerHTML='<option value="">— Aucun —</option>'+corpsO($("pl_c").value);$("pl_a").innerHTML=plAg($("pl_c").value,[...$("pl_a").querySelectorAll("input:checked")].map(x=>x.value))};
$("pl_e").onchange=()=>{if($("pl_e").value)$("pl_a").querySelectorAll("input").forEach(b=>b.checked=false)};$("pl_a").onchange=()=>{if($("pl_a").querySelector("input:checked"))$("pl_e").value=""};
$("pl_ko").onclick=()=>$("dPl").close();$("pl_x").onchange=()=>$("dPl").classList.toggle("pl-off",$("pl_x").checked);$("dPl").addEventListener("cancel",e=>e.preventDefault());
$("pl_ok").onclick=async()=>{const g=id=>$(id).value,ag=g("pl_e")?[]:[...$("pl_a").querySelectorAll("input:checked")].map(x=>x.value);
 if(!g("pl_ti").trim()||!g("pl_s")||!g("pl_z")||!g("pl_c")||!g("pl_d")){$("pl_msg").textContent="Contrôle, site, zone, catégorie et prochaine échéance sont obligatoires.";return}
 const row={titre:g("pl_ti").trim(),site_id:+g("pl_s"),tribune_id:+g("pl_z"),local:g("pl_l").trim()||null,categorie_id:+g("pl_c"),corps_etat_id:g("pl_k")?+g("pl_k"):null,consignes:g("pl_tx").trim()||null,periodicite_mois:+g("pl_m"),prochaine_echeance:g("pl_d"),prevenance_jours:+g("pl_j")||0,priorite:g("pl_p"),entreprise_id:g("pl_e")?+g("pl_e"):null,agent_ids:ag,actif:!$("pl_x").checked};
 const {error}=PE?await sb.from("plans_preventifs").update(row).eq("id",PE):await sb.from("plans_preventifs").insert(row);if(error){$("pl_msg").textContent=errMsg(error);return}$("dPl").close();await load()};
appliquerEnv();
$("lt").onclick=()=>{ENV=ENV==="test"?"prod":"test";sb=supabase.createClient(ENVS[ENV].url,ENVS[ENV].key);appliquerEnv();$("lmsg").textContent=""}; // lien invisible : bascule prod <-> test sans perdre la saisie
$("login").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT"&&e.target.type!=="checkbox"){e.preventDefault();$("go").click()}});
async function start(){
 const {data}=await sb.auth.getSession(); if(!data.session)return;if(INVITE)$("dPw").showModal();
 const p=await sb.from("profiles").select("*").eq("id",data.session.user.id).single(); me=p.data;if(p.error||!me){alert((p.error&&/permission denied|schema cache/i.test(p.error.message||"")?"Accès refusé à la base de données : les droits d'accès aux tables ne sont pas configurés (exécuter migration_droits_api.sql). ":"")+"Profil introuvable : contactez l'administrateur.");await sb.auth.signOut();return}
 $("login").classList.add("hide");$("app").classList.remove("hide");$("hd").classList.remove("hide");
 $("who").textContent=`${me.prenom||""} ${me.nom||""} · ${ROLES[me.role]}`;
 $("vas").classList.toggle("hide",me.role!=="admin");$("vasbar").classList.toggle("hide",me.role!=="admin");$("adm").classList.toggle("hide",!["admin","responsable"].includes(me.role));document.body.classList.toggle("nadm",me.role!=="admin");
 if(!me.actif){$("pending").classList.remove("hide");return}const first=!me.premiere_connexion_at;sb.rpc("marquer_connexion").then(()=>{});
 await load();loadNot();live();$("tourl").hidden=false;if(first)setTimeout(visite,600);
}
$("vas").onchange=()=>{view=$("vas").value;$("ad").classList.add("hide");render()};
$("adm").onclick=()=>{$("ad").classList.toggle("hide");render();if(!$("ad").classList.contains("hide"))loadAdmin()};

async function load(){
 const [s,t,k]=await Promise.all([sb.from("sites").select("*").order("nom"),sb.from("tribunes").select("*").order("nom"),allRows("tickets")]);
 if(s.error||t.error||k.error){alert("Erreur de chargement : "+(s.error||t.error||k.error).message);return}
 sites=s.data;trib=t.data;tk=k.data;
 const [c1,c2]=await Promise.all([sb.from("categories").select("*").order("id"),sb.from("corps_etat").select("*").order("id")]);
 if(c1.error||c2.error){alert("Erreur de chargement : "+errMsg(c1.error||c2.error));return}cats=c1.data||[];corps=(c2.data||[]).sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
 const [iv,ag]=await Promise.all([allRows("interventions"),sb.from("profiles").select("id,prenom,nom,role,email").in("role",["agent_travaux","agent_exploitation","responsable","admin"]).eq("actif",true)]);
 if(iv.error||ag.error){alert("Erreur de chargement : "+errMsg(iv.error||ag.error));return}ints=iv.data||[];agents=ag.data||[];const en=await sb.from("entreprises").select("*").order("entreprise");ents=en.data||[];{const mm=await sb.from("modeles_mail").select("*");MM=Object.fromEntries((mm.data||[]).map(m=>[m.cle,m]))}{const pp=await sb.from("plans_preventifs").select("*").order("prochaine_echeance");PL=pp.data||[]}$("ncat").innerHTML=catOpts();$("ncorps").innerHTML=corpsOpts($("ncat").value);
 
 $("ns").innerHTML=sOpts();$("nt2").innerHTML=tOpts($("ns").value);
 render();
}

$("ns").onchange=()=>$("nt2").innerHTML=tOpts($("ns").value);

function render(){
 const r=role(),isAgent=r.startsWith("agent");
 const inAdm=!$("ad").classList.contains("hide");renderIv();renderPl();$("tk").classList.toggle("hide",inAdm||tab!=="t");$("iv").classList.toggle("hide",inAdm||tab!=="i");$("adm").innerHTML=inAdm?ADM_BACK:ADM_KEY;$("adm").title=$("adm").ariaLabel=inAdm?"Retour aux tickets":"Paramètres";
 $("tkA").classList.toggle("hide",isAgent);$("tkC").classList.toggle("hide",isAgent);$("agentmsg").classList.toggle("hide",!isAgent);
 const baseL=tk.filter(x=>canSee(x,r));TB.t.base=baseL;const list=sortFilt(baseL,"t");
 const act=list.filter(x=>!done(x)),clo=list.filter(done);
 $("tkA").innerHTML=tkGroups(act,"Aucun ticket ne correspond à ces filtres.",3);
 $("clh").textContent=`Tickets clos – résolus, refusés, archivés (${clo.length})`;$("clh").classList.toggle("hide",!clo.length);
 $("tkC").innerHTML=tkGroups(clo,"",4)}


$("new").onclick=()=>{$("fNew").reset();$("np").value="normale";if(me.site_defaut_id&&sites.some(x=>x.id===me.site_defaut_id))$("ns").value=me.site_defaut_id;$("nt2").innerHTML=tOpts($("ns").value);$("ncorps").innerHTML=corpsOpts($("ncat").value);$("nmsg").textContent="";$("dNew").showModal()};
$("fNew").onsubmit=async e=>{e.preventDefault();
 if(!$("ns").value||!$("nt2").value){$("nmsg").textContent="Site et zone/tribune sont obligatoires.";return}
 if(!$("ncorps").value){$("nmsg").textContent="Le corps d'état est obligatoire : choisissez-en un avant d'enregistrer le ticket.";$("ncorps").focus();return}
 const {error}=await sb.from("tickets").insert({site_id:$("ns").value,tribune_id:$("nt2").value,local:$("nl").value||null,titre:$("nt").value,description:$("nd").value,priorite:$("np").value,categorie_id:$("ncat").value,corps_etat_id:$("ncorps").value});
 if(error){$("nmsg").textContent="Enregistrement impossible : "+errMsg(error);return}
 $("dNew").close();load()};

async function loadAdmin(){
 const dc=await sb.from("demandes_compte").select("*").order("created_at",{ascending:false});
 const pr=await sb.from("profiles").select("email,premiere_connexion_at");
 const pm=Object.fromEntries((pr.data||[]).map(u=>[(u.email||"").toLowerCase(),u]));
 const cpt=d=>{if(d.statut==="refusee")return "—";const u=pm[d.email.toLowerCase()];return !u?`<span class="off">Pas de compte</span>`:u.premiere_connexion_at?`<span class="on">Connecté (${new Date(u.premiere_connexion_at).toLocaleDateString("fr-FR")})</span>`:`<span class="s-en_attente">Compte créé, jamais connecté</span>`};
 $("drows").innerHTML=(dc.data||[]).map(d=>{const a=d.statut==="en_attente";return `<tr><td>${esc(d.prenom)} ${esc(d.nom)}</td><td>${esc(d.societe)} – ${esc(d.fonction)}</td><td>${esc(d.email)}</td><td>${cpt(d)}</td>
  <td>${a?`<select data-d="${d.id}" aria-label="Rôle à attribuer"><option value="">— Choisir un rôle —</option>${opts(ROLES)}</select>`:(d.statut==="approuvee"?"Approuvée : "+ROLES[d.role_prevu]:"Refusée")}</td>
  <td>${a?`<button data-d="${d.id}" data-a="approuvee" data-e="${esc(d.email)}">Approuver</button> <button class="sec" data-d="${d.id}" data-a="refusee">Refuser</button>`:""} <button class="sec ic" data-d="${d.id}" data-a="suppr" title="Supprimer cette demande" aria-label="Supprimer cette demande">✕</button></td></tr>`}).join("")||`<tr><td colspan="6" class="empty">Aucune demande de compte.</td></tr>`;
 const {data}=await sb.from("profiles").select("*").order("created_at",{ascending:false});
 const cxr=await sb.rpc("connexions_30j"),cx=cxr.data||{};UL=data||[];$("unev").textContent=(NEV?"Masquer":"Afficher")+" les comptes jamais connectés ("+(data||[]).filter(u=>!u.premiere_connexion_at).length+")";$("urows").innerHTML=(data||[]).filter(u=>NEV||u.premiere_connexion_at).map(u=>`<tr><td>${esc(u.prenom)} ${esc(u.nom)}</td><td>${esc(u.societe)} – ${esc(u.fonction)}</td><td>${esc(u.email)}</td>
  <td><select data-u="${u.id}" data-f="role">${opts(ROLES)}</select></td><td><select data-u="${u.id}" data-f="site_defaut_id" aria-label="Site par défaut">${O([["","— Aucun —"],...sites.map(x=>[x.id,x.nom])],u.site_defaut_id)}</select></td>
  <td>${u.derniere_connexion?tlTime(u.derniere_connexion):"—"}</td><td>${cxr.error?"—":(cx[u.id]||0)}</td>
  <td><button class="sec ic" data-u="${u.id}" data-e="1" title="Éditer" aria-label="Éditer">✎</button> <button class="${u.actif?"st-on":"st-off"}" data-u="${u.id}" data-f="actif" data-v="${!u.actif}" title="${u.actif?"Cliquer pour désactiver ce compte":"Cliquer pour activer ce compte"}">${u.actif?"Actif":"Inactif"}</button></td></tr>`).join("");
 (data||[]).forEach(u=>{const s=document.querySelector(`select[data-u="${u.id}"]`);if(s)s.value=u.role});
 renderAnn();renderGrids();renderMM();renderAff();
}
async function adm(p){const {error}=await p;$("amsg").textContent=error?"Action impossible : "+errMsg(error):"";if(error)alert("Action impossible : "+errMsg(error));await load();loadAdmin()}
$("urows").onchange=e=>{const t=e.target,f=t.dataset.f==="site_defaut_id"?"site_defaut_id":"role";adm(sb.from("profiles").update({[f]:f==="role"?t.value:(t.value?+t.value:null)}).eq("id",t.dataset.u))};
$("urows").onclick=e=>{const b=e.target.closest("button");if(b&&b.dataset.e)editU(b.dataset.u);else if(b)adm(sb.from("profiles").update({actif:b.dataset.v==="true"}).eq("id",b.dataset.u))};
$("asb").onclick=()=>{if($("as").value.trim()){adm(sb.from("sites").insert({nom:$("as").value.trim()}));$("as").value=""}};
$("drows").onclick=async e=>{const b=e.target.closest("button");if(!b)return;
 if(b.dataset.a==="suppr"){if(!confirm("Supprimer cette demande ? Le compte éventuellement déjà créé n'est pas touché."))return;
  const {error}=await sb.from("demandes_compte").delete().eq("id",b.dataset.d);
  $("cmsg").style.color=error?"":"var(--ok)";$("cmsg").textContent=error?"Suppression impossible : "+errMsg(error):"Demande supprimée.";loadAdmin();return}
 const sel=document.querySelector(`select[data-d="${b.dataset.d}"]`);
 if(b.dataset.a==="approuvee"&&!sel.value){$("cmsg").style.color="";$("cmsg").textContent="Attribuez d'abord un rôle à cette personne avant d'approuver sa demande.";sel.focus();return}
 const {error}=await sb.from("demandes_compte").update({statut:b.dataset.a,role_prevu:sel.value||"demandeur"}).eq("id",b.dataset.d);
 $("cmsg").style.color=error?"":"var(--ok)";
 $("cmsg").textContent=error?"Action impossible : "+errMsg(error):(b.dataset.a==="approuvee"?`Demande approuvée. Invitez maintenant ${b.dataset.e} dans Supabase (Authentication > Users > Invite user).`:"Demande refusée.");
 loadAdmin()};
$("pwok").onclick=async()=>{if($("np1").value.length<12){$("pmsg").textContent="12 caractères minimum.";return}
 const {error}=await sb.auth.updateUser({password:$("np1").value});
 if(error){$("pmsg").textContent="Enregistrement impossible : "+errMsg(error);return}
 $("dPw").close();history.replaceState(null,"",location.pathname)};
const TB={t:{f:{},s:{k:null,d:1},base:[]},i:{f:{},s:{k:null,d:1},base:[]},p:{f:{},s:{k:"pro",d:1},base:[]}};
const ts=d=>d?+new Date(d):0,mk=(l,v)=>({l,v,k:x=>String(v(x)).toLowerCase()});
const catLab=x=>x.categorie_id?`${(cats.find(c=>c.id===x.categorie_id)||{}).nom||"?"} / ${(corps.find(c=>c.id===x.corps_etat_id)||{}).nom||"—"}`:"—";
const refK=(x,o)=>{const [a,b,c]=x.ref.split("-").slice(o).map(Number);return a*1e8+b*1e6+c};
const COLS={
 ref:{l:"N°",c:"nw",lock:1,v:x=>x.ref,k:x=>refK(x,0)},
 titre:{...mk("Ticket",x=>x.titre),c:"tt",lock:1},
 date:{l:"Créé le",c:"nw",v:x=>new Date(x.created_at).toLocaleDateString("fr-FR"),k:x=>ts(x.created_at)},
 priorite:{l:"Priorité",c:"nw",v:x=>PR[x.priorite],k:x=>["urgente","haute","normale","basse"].indexOf(x.priorite),h:x=>`<span class="tag p-${x.priorite}">${PR[x.priorite]}</span>`},
 site:{...mk("Site",x=>siteN(x.site_id)),c:"lc"},zone:{...mk("Zone/tribune",x=>tribN(x.tribune_id)),c:"lc"},local:{...mk("Local",x=>x.local||"—"),c:"lc"},
 corps:{...mk("Corps d'état",x=>(corps.find(c=>c.id===x.corps_etat_id)||{}).nom||"—"),c:"lc"},
 par:{...mk("Demandeur",x=>x.demandeur_nom||"—"),c:"nw"},
 charge:{...mk("En charge",x=>x.en_charge_nom||"—"),c:"nw"},
 fin:{l:"Fin prévue",c:"nw",v:x=>x.fin_prevue?fdate(x.fin_prevue):"—",k:x=>ts(x.fin_prevue)},
 statut:{l:"Statut",c:"nw",v:x=>ST[x.statut],k:x=>Object.keys(ST).indexOf(x.statut),h:x=>`<span class="tag s-${x.statut}">${ST[x.statut]}</span>`}};
const np=x=>!x.echeance&&!["terminee","annulee"].includes(x.etat);
const attV=x=>{const en=ents.find(e=>e.id===x.entreprise_id);return [x.agents_noms,en?eLab(en):x.prestataire].filter(Boolean).join(" · ")||"—"};
const ICOLS={
 ref:{l:"N°",c:"nw",lock:1,v:x=>x.ref,k:x=>refK(x,1)},
 titre:{...mk("Intervention",x=>x.titre),c:"tt",lock:1},
 site:{...mk("Site",x=>siteN(x.site_id)),c:"lc"},zone:{...mk("Zone/tribune",x=>tribN(x.tribune_id)),c:"lc"},local:{...mk("Local",x=>x.local||"—"),c:"lc"},
 cat:{l:"Catégorie / corps d'état",c:"lc",v:catLab,k:x=>catLab(x).toLowerCase()},
 fin:{l:"Date d'intervention",c:"nw",v:x=>x.echeance?fdate(x.echeance):(np(x)?"À planifier":"—"),k:x=>ts(x.echeance),h:x=>x.echeance?esc(fdate(x.echeance)):(np(x)?'<span class="tag t-np">À planifier</span>':"—")},duree:{l:"Durée",c:"nw",v:x=>fduree(x.duree_h),k:x=>+x.duree_h||0},att:{...mk("Attribué à / entreprise",attV),c:"lc"},
 etat:{l:"État",c:"nw",v:x=>ET[x.etat],k:x=>Object.keys(ET).indexOf(x.etat),h:x=>`<span class="tag">${ET[x.etat]}</span>`}};
Object.entries({ref:85,titre:280,date:105,priorite:105,site:130,zone:140,local:120,corps:160,par:150,charge:150,fin:105,statut:115}).forEach(([k,w])=>COLS[k].w=w);
Object.entries({ref:100,titre:280,site:130,zone:140,local:120,cat:230,fin:140,duree:90,att:220,etat:150}).forEach(([k,w])=>ICOLS[k].w=w);
const whoPl=p=>p.entreprise_id?((ents.find(e=>e.id===p.entreprise_id)||{}).entreprise||"Entreprise"):(p.agent_ids||[]).map(i=>{const a=agents.find(x=>x.id===i);return a?(a.prenom+" "+a.nom).trim():"?"}).join(", ")||"—";
const PCOLS={
 titre:{...mk("Contrôle",p=>p.titre),c:"tt",lock:1,h:p=>`<b>${esc(p.titre)}</b>`},
 lieu:{...mk("Lieu",p=>`${siteN(p.site_id)} – ${tribN(p.tribune_id)}${p.local?" – "+p.local:""}`),c:"lc"},
 cat:{...mk("Catégorie / corps d'état",p=>((cats.find(c=>c.id===p.categorie_id)||{}).nom||"")+(p.corps_etat_id?" / "+((corps.find(c=>c.id===p.corps_etat_id)||{}).nom||""):"")),c:"lc"},
 per:{l:"Périodicité",c:"nw",v:p=>PM[p.periodicite_mois]||p.periodicite_mois+" mois",k:p=>p.periodicite_mois},
 der:{l:"Dernière réalisation",c:"nw",v:p=>p.derniere_realisation?fdate(p.derniere_realisation):"—",k:p=>ts(p.derniere_realisation)},
 pro:{l:"Prochaine échéance",c:"nw",v:p=>fdate(p.prochaine_echeance),k:p=>ts(p.prochaine_echeance)},
 st:{l:"Statut",c:"nw",v:p=>stPl(p)[1],k:p=>["retard","venir","jour","pause"].indexOf(stPl(p)[0]),h:p=>{const s=stPl(p);return `<span class="pst ${s[0]}">${s[1]}</span>`}},
 qui:{...mk("Intervenants",whoPl),c:"lc"},
 act:{l:"",c:"nw",lock:1,nof:1,v:()=>"",k:()=>0,h:p=>canPl()?`<button class="sec ic" data-pe="${p.id}" title="Modifier" aria-label="Modifier">✎</button> <button class="sec ic" data-pd="${p.id}" title="Supprimer" aria-label="Supprimer">✕</button>`:""}};
Object.entries({titre:260,lieu:260,cat:240,per:120,der:140,pro:140,st:110,qui:220,act:90}).forEach(([k,w])=>PCOLS[k].w=w);
const CB={t:COLS,i:ICOLS,p:PCOLS},redraw=tb=>tb==="t"?render():tb==="p"?renderPl():renderIv();
const done=x=>["resolue","refusee","archivee"].includes(x.statut);
const rowCls=x=>(x.statut==="nouvelle"?"new ":"")+(x.priorite==="urgente"&&!done(x)?"urg ":"")+(["resolue","refusee"].includes(x.statut)?"res":x.statut==="archivee"?"arc":"");
function sortFilt(l,tb){const T=TB[tb],C=CB[tb];l=l.filter(x=>Object.entries(T.f).every(([k,s])=>s.has(C[k].v(x))));
 if(!T.s.k)return l;const f=C[T.s.k].k;return [...l].sort((a,b)=>((f(a)>f(b))-(f(a)<f(b)))*T.s.d)}
const VIS={},vkey=tb=>`colvis:${tb}:${me.id}`;
const visOf=tb=>VIS[tb]||(VIS[tb]=(()=>{try{return JSON.parse(localStorage.getItem(vkey(tb)))||{}}catch(e){return{}}})());
const saveVis=tb=>{try{localStorage.setItem(vkey(tb),JSON.stringify(VIS[tb]))}catch(e){}};
const WID={},wkey=tb=>`colw:${tb}:${me.id}`;
const wOf=tb=>WID[tb]||(WID[tb]=(()=>{try{return JSON.parse(localStorage.getItem(wkey(tb)))||{}}catch(e){return{}}})());
const saveW=tb=>{try{localStorage.setItem(wkey(tb),JSON.stringify(WID[tb]))}catch(e){}};
const visCols=tb=>Object.entries(CB[tb]).filter(([k,c])=>c.lock||!visOf(tb)[k]);
const tw=tb=>visCols(tb).reduce((a,[k,c])=>a+(wOf(tb)[k]||c.w||120),0);
const colsHtml=tb=>visCols(tb).map(([k,c])=>`<col data-tb="${tb}" data-k="${k}" style="width:${wOf(tb)[k]||c.w||120}px">`).join("");
const thHtml=tb=>{const T=TB[tb];return visCols(tb).map(([k,c])=>c.nof?`<th></th>`:`<th aria-sort="${T.s.k===k?(T.s.d>0?"ascending":"descending"):"none"}"><button class="hb" data-s="${k}">${c.l}${T.s.k===k?(T.s.d>0?" ▲":" ▼"):""}</button><button class="hf${T.f[k]?" on":""}" data-f="${k}" aria-label="Filtrer la colonne ${c.l}">${T.f[k]?"⧩":"▾"}</button><span class="rs" data-tb="${tb}" data-r="${k}" title="Glisser pour ajuster la largeur"></span></th>`).join("")};
const rowH=(tb,x,cls,attr)=>`<tr class="c ${cls}" ${attr}>${visCols(tb).map(([k,c])=>`<td class="${c.c||""}">${c.h?c.h(x):esc(c.v(x))}</td>`).join("")}</tr>`;
function head(tb){if(tb==="p"){$("phr").innerHTML=thHtml("p");$("pcg").innerHTML=colsHtml("p");$("ptab").style.width=tw("p")+"px"}if(tb==="i"){$("ihr").innerHTML=thHtml("i");$("ihr2").innerHTML=thHtml("i");$("icg").innerHTML=$("icg2").innerHTML=colsHtml("i");document.querySelectorAll('table[data-tb="i"]').forEach(t=>t.style.width=tw("i")+"px")}}
const hdClick=tb=>e=>{const b=e.target.closest("button");if(!b)return;const T=TB[tb];
 if(b.dataset.s){T.s=T.s.k===b.dataset.s?{k:T.s.k,d:-T.s.d}:{k:b.dataset.s,d:1};redraw(tb)}else openPop(tb,b.dataset.f,b)};
$("ihr").onclick=$("ihr2").onclick=hdClick("i");$("phr").onclick=hdClick("p");
const catGroups=()=>[...cats.filter(c=>c.domaine==="exploitation"),...cats.filter(c=>c.domaine==="batiments"),...cats.filter(c=>c.domaine!=="exploitation"&&c.domaine!=="batiments"),{id:null,nom:"Sans catégorie"}];
function tkGroups(list,msg,lvl){const o=catGroups().map(g=>{const l=list.filter(x=>(x.categorie_id||null)===g.id);if(!l.length)return"";
 return `<h${lvl} class="gh">${esc(g.nom)} <small>(${l.length})</small></h${lvl}><div class="table"><table class="rt" data-tb="t" style="width:${tw("t")}px"><colgroup>${colsHtml("t")}</colgroup><thead><tr>${thHtml("t")}</tr></thead><tbody>${l.map(x=>rowH("t",x,rowCls(x),`data-id="${x.id}"`)).join("")}</tbody></table></div>`}).join("");
 return o||(msg?`<p class="empty">${msg}</p>`:"")}
const tkClick=e=>{if(e.target.closest("button.hb,button.hf"))return hdClick("t")(e);const tr=e.target.closest("tr.c");if(tr)openDet(+tr.dataset.id)};
$("tkA").onclick=$("tkC").onclick=tkClick;
let cpTb=null;
function openCols(tb,btn){const p=$("cpop");if(!p.classList.contains("hide")&&cpTb===tb){p.classList.add("hide");return}
 cpTb=tb;const V=visOf(tb);p.innerHTML=`<b style="font-size:13px">Colonnes affichées</b>`+Object.entries(CB[tb]).filter(([k,c])=>!c.nof).map(([k,c])=>`<label class="ck"><input type="checkbox" data-c="${k}"${!V[k]||c.lock?" checked":""}${c.lock?" disabled":""}> ${esc(c.l)}</label>`).join("")+`<button class="sec pb" data-all>Tout afficher</button><button class="sec pb" data-rw>Réinitialiser les largeurs</button>`;
 const r=btn.getBoundingClientRect();p.style.top=(r.bottom+scrollY+4)+"px";p.style.left=Math.max(8,Math.min(r.left+scrollX,innerWidth-275))+"px";p.classList.remove("hide")}
$("cpop").onchange=e=>{const k=e.target.dataset.c;if(!k)return;const V=visOf(cpTb);if(e.target.checked)delete V[k];else{V[k]=true;delete TB[cpTb].f[k]}saveVis(cpTb);redraw(cpTb)};
$("cpop").onclick=e=>{if(e.target.closest("[data-rw]")){WID[cpTb]={};saveW(cpTb);redraw(cpTb);return}if(!e.target.closest("[data-all]"))return;const V=visOf(cpTb);Object.keys(V).forEach(k=>delete V[k]);saveVis(cpTb);document.querySelectorAll("#cpop [data-c]").forEach(b=>b.checked=true);redraw(cpTb)};
$("colt").onclick=e=>openCols("t",e.currentTarget);$("coli").onclick=e=>openCols("i",e.currentTarget);$("colp").onclick=e=>openCols("p",e.currentTarget);
function setW(tb,k,w){wOf(tb)[k]=w;document.querySelectorAll(`col[data-tb="${tb}"][data-k="${k}"]`).forEach(c=>c.style.width=w+"px");document.querySelectorAll(`table[data-tb="${tb}"]`).forEach(t=>t.style.width=tw(tb)+"px")}
document.addEventListener("pointerdown",e=>{const h=e.target.closest(".rs");if(!h)return;e.preventDefault();
 const tb=h.dataset.tb,k=h.dataset.r,x0=e.clientX,w0=h.parentElement.getBoundingClientRect().width;
 const mv=ev=>setW(tb,k,Math.max(60,Math.round(w0+ev.clientX-x0))),up=()=>{document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);saveW(tb)};
 document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up)});
function openPop(tb,k,btn){const T=TB[tb],C=CB[tb],c=C[k],o=T.base.filter(x=>Object.entries(T.f).every(([j,s])=>j===k||s.has(C[j].v(x)))).sort((a,b)=>(c.k(a)>c.k(b))-(c.k(a)<c.k(b)));
 const vals=[...new Set(o.map(c.v))],cur=T.f[k]||new Set(vals),p=$("pop");p.dataset.k=k;p.dataset.tb=tb;
 p.innerHTML=`<button class="sec pb" data-o="asc">Trier du plus petit au plus grand (A → Z)</button><button class="sec pb" data-o="desc">Trier du plus grand au plus petit (Z → A)</button>
 <input id="pq" placeholder="Rechercher" aria-label="Rechercher dans les valeurs">
 <label class="ck"><input type="checkbox" id="pall"${vals.every(v=>cur.has(v))?" checked":""}> (Tout sélectionner)</label>
 <div id="pl">${vals.map(v=>`<label class="ck"><input type="checkbox" data-v="${esc(v)}"${cur.has(v)?" checked":""}> ${esc(v)}</label>`).join("")}</div>
 <button class="sec pb" data-o="clear">Effacer le filtre de cette colonne</button>`;
 const r=btn.getBoundingClientRect();p.style.top=(r.bottom+scrollY+4)+"px";p.style.left=Math.max(8,Math.min(r.left+scrollX,innerWidth-275))+"px";p.classList.remove("hide")}
$("pop").onclick=e=>{const b=e.target.closest("button");if(!b)return;const tb=$("pop").dataset.tb,k=$("pop").dataset.k,T=TB[tb];
 if(b.dataset.o==="clear")delete T.f[k];else T.s={k,d:b.dataset.o==="asc"?1:-1};$("pop").classList.add("hide");redraw(tb)};
$("pop").onchange=e=>{const tb=$("pop").dataset.tb,k=$("pop").dataset.k,T=TB[tb],bx=[...document.querySelectorAll("#pl input")];
 if(e.target.id==="pall")bx.forEach(b=>b.checked=e.target.checked);
 if(bx.every(b=>b.checked))delete T.f[k];else T.f[k]=new Set(bx.filter(b=>b.checked).map(b=>b.dataset.v));
 $("pall").checked=bx.every(b=>b.checked);redraw(tb)};
$("pop").oninput=e=>{if(e.target.id!=="pq")return;const q=e.target.value.toLowerCase();
 document.querySelectorAll("#pl label").forEach(l=>l.classList.toggle("hide",!l.textContent.toLowerCase().includes(q)))};
document.addEventListener("click",e=>{if(!e.target.closest("#pop,.hf"))$("pop").classList.add("hide");if(!e.target.closest("#cpop,#colt,#coli,#colp"))$("cpop").classList.add("hide")});
const isResp=r=>r==="responsable";
const dom=r=>({agent_travaux:"batiments",agent_exploitation:"exploitation"})[r];
const catDom=x=>(cats.find(c=>c.id===x.categorie_id)||{}).domaine;
const peutEditer=(x,r)=>r==="admin"||isResp(r);
const canSee=(x,r)=>peutEditer(x,r)||r==="supervision"||(["demandeur","responsable"].includes(r)&&x.demandeur_id===me.id&&x.statut!=="archivee");
let cats=[],corps=[];
const ET={planifiee:"Planifiée",en_attente_pieces:"En attente de pièces",en_cours:"En cours",terminee:"Terminée",annulee:"Annulée"};
const FINANCES=false;   // passer à true pour réactiver le suivi financier (devis, bon de commande, factures, montants)
const SU=[["devis_demande_at","Devis demandé","d"],["devis_recu_at","Devis reçu","d"],["bc_numero","N° de bon de commande (12 caractères min.)","t"],["bc_envoye_at","Bon de commande envoyé","d"],["facture_recue","Facture reçue","n"],["facture_payee","Facture payée","n"],["montant_devis_ht","Devis HT (€)","m"],["montant_bc_ht","Bon de commande HT (€)","m"],["montant_facture_ht","Facture HT (€)","m"]];
const eur=v=>Number(v).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const NPO=[["non","Non"],["partiel","Partiel"],["oui","Oui"]];
const suIn=(k,l,t,c)=>`<div style="flex:1 1 45%"><label>${l}</label>${t==="d"?`<input type="date" data-f="${k}" value="${c[k]||""}">`:t==="m"?`<input type="number" min="0" step="0.01" data-f="${k}" value="${c[k]??""}">`:t==="t"?`<input data-f="${k}" value="${esc(c[k]||"")}">`:`<select data-f="${k}">${O(NPO,c[k]||"non")}</select>`}</div>`;
const suVw=(k,l,t,c)=>t==="d"?(c[k]?`✔ ${l} (${fdate(c[k])})`:`○ ${l}`):t==="m"?`${l} : ${c[k]!=null&&c[k]!==""?eur(c[k]):"—"}`:t==="t"?(c[k]?`✔ BC n° ${esc(c[k])}`:"○ N° de bon de commande"):`${l} : ${(NPO.find(x=>x[0]===(c[k]||"non"))||[])[1]}`;
function fmtTel(v){if(!v)return"";const s=String(v).trim(),d=s.replace(/\D/g,"");let m=d.match(/^(?:0033|33)0?(\d{9})$/);
 if(m)return"+33 "+m[1][0]+" "+m[1].slice(1).replace(/(\d{2})(?=\d)/g,"$1 ");m=d.match(/^0(\d{9})$/);
 if(m)return"0"+m[1][0]+" "+m[1].slice(1).replace(/(\d{2})(?=\d)/g,"$1 ");
 return(s[0]==="+"?"+":"")+d.replace(/(\d{2})(?=\d)/g,"$1 ")}
const eLab=e=>e.entreprise+(e.contact?" – "+e.contact:"");
function entOpts(c){const inC=ents.filter(e=>!(e.categorie_ids||[]).length||(e.categorie_ids||[]).includes(c.categorie_id)),m=c.corps_etat_id?inC.filter(e=>e.corps_etat_id===c.corps_etat_id):[],o=inC.filter(e=>!m.includes(e)),
 op=(e,b)=>`<option value="${e.id}"${e.id===c.entreprise_id?" selected":""}${b?' style="font-weight:bold"':""}>${esc(eLab(e))}</option>`;
 return (m.length?`<optgroup label="Corps d'état : ${esc((corps.find(x=>x.id===c.corps_etat_id)||{}).nom||"")}">${m.map(e=>op(e,1)).join("")}</optgroup>`:"")+(o.length?`<optgroup label="${m.length?"Autres entreprises de la catégorie":"Entreprises de la catégorie"}">${o.map(e=>op(e)).join("")}</optgroup>`:"")}
const dv=()=>!FINANCES?"":`<label class="ck"><input type="checkbox" data-dv${devisMail?" checked":""}> Inclure une demande de devis dans le mail</label>`;
let ints=[],agents=[],ents=[],curI=null,pendingTicket=null,tab="t",ed=false,imode="a",devisMail=false;
const fdate=d=>d?new Date(d).toLocaleDateString("fr-FR"):"—",nm=()=>`${me.prenom} ${me.nom}`,isAg=()=>role().startsWith("agent"),today=()=>new Date().toLocaleDateString("sv-SE");
const fduree=h=>{if(h==null||h==="")return"—";h=+h;let hh=Math.floor(h+1e-9),mm=Math.round((h-hh)*60);if(mm===60){hh++;mm=0}return hh===0?mm+" min":hh+" h"+(mm?" "+String(mm).padStart(2,"0"):"")};
const O=(a,v)=>a.map(([k,l])=>`<option value="${k}"${String(k)===String(v)?" selected":""}>${esc(l)}</option>`).join("");
const sitesO=v=>O(sites.map(x=>[x.id,x.nom]),v),tribO=(sid,v)=>O(trib.filter(t=>t.site_id==sid).map(t=>[t.id,t.nom]),v),catsO=(v,mine)=>O(cats.map(c=>[c.id,c.nom]),v),corpsO=(cid,v)=>O(corps.filter(x=>x.actif!==false&&x.categorie_id==cid).map(x=>[x.id,x.nom]),v),prioO=v=>O(Object.entries(PR),v);
const tlTime=d=>new Date(d).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"});
function askJust(t){return new Promise(res=>{const d=$("dJ");$("jt").textContent=t;$("jx").value="";$("jm").textContent="";d.onclose=()=>res(null);$("jno").onclick=()=>d.close();
 $("jok").onclick=()=>{const v=$("jx").value.trim();if(!v){$("jm").textContent="La justification est obligatoire.";return}res(v);d.onclose=null;d.close()};d.showModal()})}
function norm(t){const f=t.dataset.f;let v=t.value===""?null:t.value;if(f.endsWith("_id")&&f!=="en_charge_id"&&v!==null)v=+v;if(f==="duree_h"&&v!==null)v=Math.round(parseFloat(String(v).replace(",","."))*100)/100;const u={[f]:v};
 if(f==="site_id")u.tribune_id=(trib.find(x=>x.site_id===v)||{}).id||null;
 if(f==="categorie_id")u.corps_etat_id=(corps.find(x=>x.categorie_id===v)||{}).id||null;return u}
const baseF=(c,mine)=>`<div class="row"><div><label>Site</label><select data-f="site_id">${sitesO(c.site_id)}</select></div><div><label>Zone/tribune</label><select data-f="tribune_id">${tribO(c.site_id,c.tribune_id)}</select></div></div>
<label>Local</label><input data-f="local" value="${esc(c.local||"")}">
<div class="row"><div><label>Catégorie</label><select data-f="categorie_id">${catsO(c.categorie_id,mine)}</select></div><div><label>Corps d'état</label><select data-f="corps_etat_id">${corpsO(c.categorie_id,c.corps_etat_id)}</select></div></div>
<label>Titre</label><input data-f="titre" value="${esc(c.titre)}">`;
const chargeO=c=>{const d=catDom(c);return O([...agents.filter(a=>a.role==="admin"||isResp(a.role)).map(a=>[a.id,`${((a.prenom||"")+" "+(a.nom||"")).trim()} (${ROLES[a.role]})`])],c.en_charge_id)};
const hdr=c=>`<div class="dh"><div><h2>${esc(siteN(c.site_id))}</h2><div class="sub">${esc(tribN(c.tribune_id))}${c.local?" · "+esc(c.local):""}</div></div>`;
// ===== TICKET =====
const canT=()=>peutEditer(cur,role()),canF=()=>canT()||(cur.demandeur_id===me.id&&cur.statut==="nouvelle"&&["demandeur","responsable"].includes(role()));
function openDet(id){cur=tk.find(x=>x.id===id);ed=false;drawT();$("dDet").showModal()}
function drawT(){const c=cur,E=ed&&canF(),cn=canT();
 $("tbody").innerHTML=`${hdr(c)}${canF()?`<button class="ic" data-edit title="Modifier" aria-label="Modifier">✎</button>`:""}</div>
 <p class="big"><b>${c.ref}</b> – ${esc(c.titre)}</p><div class="desc">${esc(c.description||"Aucune description.")}</div>
 ${E?`<div class="ep">${baseF(c)}<label>Description</label><textarea data-f="description" rows="3">${esc(c.description||"")}</textarea><label>Priorité</label><select data-f="priorite">${prioO(c.priorite)}</select>${cn?`<label>En charge</label><select data-f="en_charge_id">${chargeO(c)}</select>`:""}</div>`:""}
 <p class="meta">${esc(catLab(c))} · demandé par ${esc(c.demandeur_nom||"—")} le ${fdate(c.created_at)} · Priorité ${PR[c.priorite]}</p>
 <p><span class="tag s-${c.statut}">${ST[c.statut]}</span>${c.fin_prevue?` &nbsp;Fin d'intervention prévue : <b>${fdate(c.fin_prevue)}</b>`:""}</p>
 ${c.en_charge_nom||cn?`<p>En charge : <b>${esc(c.en_charge_nom||"personne pour l'instant")}</b>${cn&&c.en_charge_id!==me.id?` <button class="sec" data-me>Me l'attribuer</button>`:""}</p>`:""}
 ${cn?`<div class="btns">${Object.entries(ST).filter(([k])=>k!==c.statut).map(([k,v])=>`<button class="sec" data-st="${k}">${v}</button>`).join("")}</div>`:""}
 <h3>Historique</h3><div id="tl"></div>${!cn&&c.demandeur_id===me.id?`<textarea id="nt1" rows="2" placeholder="Écrire un message à l'équipe" aria-label="Message à l'équipe" style="margin-top:8px"></textarea><button data-note style="margin-top:6px">Envoyer le message</button>`:""}
 ${cn?`<textarea id="nt1" rows="2" placeholder="Ajouter une note" aria-label="Nouvelle note" style="margin-top:8px"></textarea><label class="ck" style="margin-top:6px"><input type="checkbox" id="nti" checked> Note interne (invisible du demandeur)</label><button data-note style="margin-top:6px">Ajouter la note</button>
 <h3>Interventions</h3>${ints.filter(x=>x.ticket_id===c.id).map(i=>`<div class="tl"><a class="lnk" data-i="${i.id}">${esc(i.ref)}</a> – ${esc(i.titre)} (${ET[i.etat]})</div>`).join("")||`<p class="empty" style="padding:8px">Aucune intervention.</p>`}
 <button class="sec" data-newint>Créer une intervention depuis ce ticket</button>`:""}${role()==="supervision"?`<h3>Interventions</h3>${ints.filter(x=>x.ticket_id===c.id).map(i=>`<div class="tl"><a class="lnk" data-i="${i.id}">${esc(i.ref)}</a> – ${esc(i.titre)} (${ET[i.etat]})</div>`).join("")||`<p class="empty" style="padding:8px">Aucune intervention.</p>`}`:""}`;loadTl()}
async function loadTl(){const cn=canT()||role()==="supervision";
 const [e,n]=await Promise.all([cn?sb.from("ticket_events").select("*").eq("ticket_id",cur.id):{data:[]},sb.from("ticket_suivi").select("*").eq("ticket_id",cur.id)]);
 const L=[...(e.data||[]).map(v=>({d:v.created_at,a:v.par_nom,t:v.type==="creation"?"Ticket créé":v.type==="modif"?`Modifié – ${v.ancien} : ${v.nouveau}`:`Statut : ${ST[v.ancien]||"—"} → ${ST[v.nouveau]||v.nouveau}`})),
  ...(n.data||[]).filter(x=>!(cn&&x.message.startsWith("Statut changé"))).map(x=>({d:x.created_at,a:x.auteur,t:x.message,n:1,i:x.interne}))].sort((a,b)=>new Date(a.d)-new Date(b.d));
 $("tl").innerHTML=L.map(x=>`<div class="tl${x.n?" nt":""}"><span>${tlTime(x.d)}</span>${x.a?"<b>"+esc(x.a)+"</b> : ":""}${x.i?'<span class="tag">interne</span> ':""}${esc(x.t)}</div>`).join("")||`<p class="empty" style="padding:8px">Aucun historique.</p>`}
async function reloadT(){await load();const n=tk.find(x=>x.id===cur.id);
 if(!n){$("dDet").close();alert("Le ticket a été transféré vers l'autre catégorie : il n'apparaît plus dans votre liste.");return}cur=n;drawT()}
async function setSt(k){let j=null;if(k==="resolue"||k==="refusee"){j=await askJust((k==="refusee"?"Refus du ticket ":"Clôture du ticket ")+cur.ref);if(!j)return}
 const {error}=await sb.rpc("ticket_changer_statut",{p_id:cur.id,p_statut:k,p_justif:j});if(error){alert("Modification impossible : "+errMsg(error));return}reloadT()}
$("tbody").onchange=async e=>{if(!e.target.dataset.f)return;const u=norm(e.target);if(u.titre===null){alert("Le titre est obligatoire.");drawT();return}
 const {error}=await sb.from("tickets").update(u).eq("id",cur.id);if(error){alert("Modification impossible : "+errMsg(error));drawT();return}reloadT()};
$("tbody").onclick=async e=>{const b=e.target.closest("[data-edit],[data-st],[data-note],[data-newint],[data-i],[data-me]");if(!b)return;const d=b.dataset;
 if("edit" in d){ed=!ed;drawT()}else if("me" in d){const {error}=await sb.from("tickets").update({en_charge_id:me.id}).eq("id",cur.id);if(error)alert("Modification impossible : "+errMsg(error));else reloadT()}else if(d.st)setSt(d.st)
 else if("note" in d){const m=$("nt1").value.trim();if(!m)return;const {error}=await sb.from("ticket_suivi").insert({ticket_id:cur.id,auteur:nm(),message:m,interne:$("nti")?$("nti").checked:false});if(error)alert(errMsg(error));else loadTl();$("nt1").value=""}
 else if("newint" in d){$("dDet").close();pendingTicket=cur;openIv(null,cur)}
 else if(d.i){$("dDet").close();pendingTicket=null;openIv(ints.find(x=>x.id==d.i))}};
// ===== INTERVENTIONS =====
function renderIv(){const r=role(),ag=isAg(),edt=r!=="demandeur"&&!ag;
 if(ag)tab="i";if(r==="demandeur")tab="t";
 const inAdm=!$("ad").classList.contains("hide");$("tabs").classList.toggle("hide",inAdm);
 $("tabt").classList.toggle("hide",ag||r==="demandeur");$("tabi").classList.toggle("hide",r==="demandeur");
 $("tabt").classList.toggle("sec",tab!=="t");$("tabi").classList.toggle("sec",tab!=="i");
 $("new").classList.toggle("hide",tab!=="t"||ag||r==="supervision");$("colt").classList.toggle("hide",tab!=="t"||ag);$("dash").classList.toggle("hide",!edt);$("newint").classList.toggle("hide",tab!=="i"||!edt||r==="supervision");$("coli").classList.toggle("hide",tab!=="i");
 const base=ints.filter(i=>ag?(i.agent_ids||[]).includes(me.id):(peutEditer(i,r)||r==="supervision"));TB.i.base=base;
 const l=sortFilt(base,"i"),cl=i=>["terminee","annulee"].includes(i.etat),ope=l.filter(i=>!cl(i)),act=[...ope.filter(np),...ope.filter(i=>!np(i))],clo=l.filter(cl);head("i");
 $("iempty").classList.toggle("hide",act.length>0);$("iempty2").classList.toggle("hide",clo.length>0);$("ich").textContent=`Interventions closes – terminées, annulées (${clo.length})`;
 const row=i=>rowH("i",i,i.etat==="terminee"?"res":i.etat==="annulee"?"arc":np(i)?"np":"",`data-i="${i.id}"`);
 $("irows").innerHTML=act.map(row).join("");$("irows2").innerHTML=clo.map(row).join("")}
$("tabt").onclick=()=>{tab="t";render()};$("tabi").onclick=()=>{tab="i";render()};$("tabp").onclick=()=>{tab="p";render()};
$("newint").onclick=()=>{pendingTicket=null;openIv(null,null)};
$("irows").onclick=e=>{const tr=e.target.closest("tr");if(tr){pendingTicket=null;openIv(ints.find(x=>x.id==tr.dataset.i))}};
function openIv(i,t){const v=i?{...i}:{site_id:t?t.site_id:((sites.find(x=>x.id===me.site_defaut_id)||sites[0])||{}).id,tribune_id:t?t.tribune_id:null,local:t?t.local:null,categorie_id:t?t.categorie_id:((isResp(role())&&cats.find(x=>x.domaine===dom(role())))||cats[0]||{}).id,corps_etat_id:t?t.corps_etat_id:null,
 titre:t?t.titre:"",consignes:t&&t.description||"",priorite:t?t.priorite:"normale",etat:"planifiee",agent_ids:[],echeance:null,duree_h:null};
 if(!i&&!v.tribune_id)v.tribune_id=(trib.find(x=>x.site_id===v.site_id)||{}).id;if(!i&&!v.corps_etat_id)v.corps_etat_id=(corps.find(x=>x.categorie_id===v.categorie_id)||{}).id||null;
 curI=v;ed=false;imode=v.entreprise_id?"e":"a";devisMail=false;drawI();if(!$("dIv").open)$("dIv").showModal()}
function planCard(c,quick){const miss=!c.echeance&&!["terminee","annulee"].includes(c.etat);
 const d=c.echeance?`<span class="pv2">${esc(fdate(c.echeance))}</span>`:(quick?`<input type="date" data-f="echeance" aria-label="Date d'intervention"> <span class="tag t-np">À planifier</span>`:(miss?`<span class="tag t-np">À planifier</span>`:`<span class="meta">non précisée</span>`));
 const u=c.duree_h?`<span class="pv2">${esc(fduree(c.duree_h))}</span>`:(quick?`<input type="number" class="dur" data-f="duree_h" min="0.25" max="999" step="0.25" inputmode="decimal" placeholder="heures" aria-label="Durée en heures"> <small>h</small>`:`<span class="meta">non précisée</span>`);
 return `<div class="plan${miss?" np":""}"><div><span class="pl">Date d'intervention</span>${d}</div><div><span class="pl">Durée</span>${u}</div></div>`}
function drawI(){const c=curI,saved=!!c.id,r=role(),ag=isAg(),canE=!ag&&r!=="demandeur"&&(!saved||peutEditer(c,r)),E=canE&&(ed||!saved),mine=ag&&(c.agent_ids||[]).includes(me.id);
 const mode=c.entreprise_id?"e":imode,ent=ents.find(x=>x.id===c.entreprise_id),t=c.ticket_id&&tk.find(x=>x.id===c.ticket_id),cd=catDom(c);
 const ce=corps.find(x=>x.id===c.corps_etat_id),allE=!ce||ce.nom==="Tous corps d'état";
 $("ibody").innerHTML=`${hdr(c)}${canE&&saved?`<button class="ic" data-edit title="Modifier" aria-label="Modifier">✎</button>`:""}</div>
 <p class="big"><b>${saved?c.ref:"Nouvelle intervention"}</b> – ${esc(c.titre||"")}</p><div class="desc">${esc(c.consignes||"Aucune consigne.")}</div>
 ${E?`<div class="ep">${baseF(c,1)}<label>Consignes</label><textarea data-f="consignes" rows="3">${esc(c.consignes||"")}</textarea>
  <div class="row"><div><label>Priorité</label><select data-f="priorite">${prioO(c.priorite)}</select></div><div><label>Date d'intervention</label><input type="date" data-f="echeance" value="${c.echeance||""}"></div><div><label>Durée (heures)</label><input type="number" data-f="duree_h" min="0.25" max="999" step="0.25" inputmode="decimal" placeholder="ex. 1,5" value="${c.duree_h??""}"></div></div>
  <label>Intervenants</label><select data-f="mode">${O([["a","Agents / responsables"],["e","Entreprise"]],mode)}</select>
  ${mode==="a"?agents.filter(a=>a.role==="responsable"||!cd||dom(a.role)===cd).map(a=>`<label class="ck"><input type="checkbox" data-agent="${a.id}" data-n="${esc(((a.prenom||"")+" "+(a.nom||"")).trim())}"${(c.agent_ids||[]).includes(a.id)?" checked":""}> ${esc(a.prenom||"")} ${esc(a.nom||"")} <small>(${ROLES[a.role]})</small></label>`).join("")||`<span class="empty" style="padding:4px">Aucun agent actif dans ce domaine.</span>`
  :`<label>Interlocuteur (entreprises de la catégorie, celles du corps d'état en tête)</label><select data-f="entreprise_id"><option value="">— Choisir —</option>${entOpts(c)}</select>${dv()}
  ${FINANCES?`<div class="row" style="flex-wrap:wrap">${SU.map(([k,l,t])=>suIn(k,l,t,c)).join("")}</div>`:""}`}</div>`:""}
 ${saved?planCard(c,canE&&!E):""}<p class="meta">${t?"Ticket "+esc(t.ref)+" · ":"Sans ticket · "}${esc(catLab(c))} · Priorité ${PR[c.priorite]}</p>
 <p>${mode==="e"?`<b>${esc(ent?ent.entreprise:c.prestataire||"")}</b>${ent?`<br>${esc(ent.contact||"")} · ${esc(ent.email||"")} · ${esc(fmtTel(ent.mobile))}`:""}`:`Attribué à : ${esc(c.agents_noms||"à désigner")}`}</p>${mode==="e"&&saved&&canE&&!E?dv():""}
 ${saved&&mode==="e"&&FINANCES?`<p class="meta">${SU.map(([k,l,t])=>suVw(k,l,t,c)).join(" · ")}</p>`:""}
 ${saved?`<p><span class="tag">${ET[c.etat]}</span></p>`:""}
 ${saved&&(canE||mine)?`<div class="btns">${Object.entries(ET).filter(([k])=>k!==c.etat&&!(ag&&k==="annulee")).map(([k,v])=>`<button class="sec" data-et="${k}">${v}</button>`).join("")}</div>`:""}
 ${saved&&canE?`<div class="btns">${mode==="e"?`<button data-mail>Envoyer le mail</button>`:`<button class="sec" data-pdf>Fiche PDF</button><button class="sec" data-mail>E-mail</button>`}${c.ticket_id&&tk.some(x=>x.id===c.ticket_id)?`<button class="sec" data-another>Nouvelle intervention pour ce ticket</button>`:""}</div>`:""}
 ${saved?`<h3>Notes</h3><div id="inl"></div>${r==="supervision"?"":`<textarea id="inm" rows="2" aria-label="Nouvelle note" style="margin-top:8px"></textarea><button data-nadd style="margin-top:6px">Ajouter la note</button>`}${(canE||r==="supervision")?`<h3>Historique des modifications</h3><div id="ih"></div>`:""}`
 :`<p class="msg" id="imsg"></p><button data-create>Créer l'intervention</button> <button class="sec" data-icancel>Annuler</button>`}`;if(saved){loadN();if(canE||r==="supervision")loadH()}}
async function loadN(){const {data}=await sb.from("intervention_notes").select("*").eq("intervention_id",curI.id).order("created_at");
 $("inl").innerHTML=(data||[]).map(x=>`<div class="tl nt"><span>${tlTime(x.created_at)}</span><b>${esc(x.auteur)}</b> : ${esc(x.message)}</div>`).join("")||`<p class="empty" style="padding:8px">Aucune note.</p>`}
async function upd(u){if(curI.id){const {error}=await sb.from("interventions").update(u).eq("id",curI.id);if(error){alert("Modification impossible : "+errMsg(error));drawI();return}
 await load();curI=ints.find(x=>x.id===curI.id)||{...curI,...u}}else Object.assign(curI,u);drawI()}
$("ibody").onchange=async e=>{const t=e.target,d=t.dataset;
 if(d.agent!==undefined){const ch=[...document.querySelectorAll("#ibody [data-agent]:checked")];return upd({agent_ids:ch.map(b=>b.dataset.agent),agents_noms:ch.map(b=>b.dataset.n).join(", "),entreprise_id:null,prestataire:null,prestataire_email:null})}
 if(d.dv!==undefined){devisMail=t.checked;return t.checked&&!curI.devis_demande_at?upd({devis_demande_at:today()}):drawI()}
 if(!d.f)return;let u=norm(t);
 if(d.f==="mode"){const to=t.value,hasA=(curI.agent_ids||[]).length>0,hasE=!!curI.entreprise_id;
  if(curI.id&&((to==="e"&&hasA)||(to==="a"&&hasE))&&!confirm(to==="e"?"Attribuer à une entreprise retire les agents actuellement désignés. Continuer ?":"Attribuer à des agents retire l'entreprise actuellement désignée. Continuer ?")){drawI();return}
  imode=to;if(to==="e"){if(!hasA){drawI();return}u={agent_ids:[],agents_noms:null}}else u={entreprise_id:null,prestataire:null,prestataire_email:null}}
 if(d.f==="entreprise_id"){const en=ents.find(x=>x.id===u.entreprise_id);u=en?{entreprise_id:en.id,prestataire:en.entreprise+(en.contact?" – "+en.contact:""),prestataire_email:en.email,agent_ids:[],agents_noms:null}:{entreprise_id:null,prestataire:null,prestataire_email:null}}
 if(d.f==="titre"&&!u.titre){alert("Le titre est obligatoire.");drawI();return}
 if(d.f==="duree_h"&&u.duree_h!==null&&!(u.duree_h>=0.25&&u.duree_h<=999)){alert("La durée doit être comprise entre 0,25 et 999 heures.");drawI();return}
 if(d.f==="bc_numero"&&u.bc_numero){u.bc_numero=u.bc_numero.trim();if(u.bc_numero.length<12){alert("Le numéro de bon de commande doit comporter au moins 12 caractères.");drawI();return}}upd(u)};
async function setEt(k){let j=null;if(k==="terminee"){j=await askJust("Clôture de l'intervention "+curI.ref);if(!j)return}
 const {error}=await sb.rpc("intervention_etat",{p_id:curI.id,p_etat:k,p_justif:j});if(error){alert("Modification impossible : "+errMsg(error));return}
 const tid=curI.ticket_id,t=tid&&tk.find(x=>x.id===tid);
 if(k==="terminee"&&t&&!isAg()&&!["resolue","refusee","archivee"].includes(t.statut)){const au=ints.filter(x=>x.ticket_id===tid&&x.id!==curI.id&&!["terminee","annulee"].includes(x.etat)).length;
  if(confirm(`Passer aussi le ticket ${t.ref} en « Résolu » ?`+(au?`\nAttention : ${au} autre(s) intervention(s) de ce ticket ne sont pas terminées.`:""))){await sb.rpc("ticket_changer_statut",{p_id:tid,p_statut:"resolue",p_justif:`(intervention ${curI.ref}) : ${j}`})}}
 await load();curI=ints.find(x=>x.id===curI.id)||curI;drawI()}
async function createI(){const c=curI,o={};["site_id","tribune_id","local","categorie_id","corps_etat_id","titre","consignes","priorite","echeance","duree_h","etat","agent_ids","agents_noms","prestataire","prestataire_email","entreprise_id",...SU.map(x=>x[0])].forEach(k=>{if(c[k]!==undefined)o[k]=c[k]});
 if(o.entreprise_id){o.agent_ids=[];o.agents_noms=null}else if((o.agent_ids||[]).length){o.prestataire=null;o.prestataire_email=null}
 if(!o.titre||!o.site_id||!o.tribune_id||!o.categorie_id){$("imsg").textContent="Titre, site, zone/tribune et catégorie sont obligatoires.";return}
 const tid=pendingTicket?pendingTicket.id:null,{data,error}=await sb.from("interventions").insert({...o,ticket_id:tid}).select().single();
 if(error){$("imsg").textContent="Création impossible : "+errMsg(error);return}
 const t=tid&&tk.find(x=>x.id===tid);if(t&&["nouvelle","resolue"].includes(t.statut)){await sb.from("tickets").update({statut:"en_cours"}).eq("id",tid);if(t.statut==="resolue")await sb.from("ticket_suivi").insert({ticket_id:tid,auteur:nm(),message:`Ticket rouvert : nouvelle intervention ${data.ref}`})}
 await load();curI=ints.find(x=>x.id===data.id)||data;ed=false;drawI()}
function pdfI(){const c=curI,{jsPDF}=window.jspdf,d=new jsPDF();let y=18;
 const T=(t,b,z)=>{d.setFont("helvetica",b?"bold":"normal");d.setFontSize(z||11);const L=d.splitTextToSize(String(t),180);d.text(L,15,y);y+=L.length*6+2};
 T("FICHE D'INTERVENTION "+c.ref,1,16);y+=2;T(c.titre,1,13);T(`Lieu : ${siteN(c.site_id)} / ${tribN(c.tribune_id)}${c.local?" / "+c.local:""}`);T(`Catégorie : ${catLab(c)}`);
 T(`Priorité : ${PR[c.priorite]}      Date d'intervention : ${c.echeance?fdate(c.echeance):"à planifier"}      Durée : ${c.duree_h?fduree(c.duree_h):"non précisée"}`);T(`Intervenants : ${c.agents_noms||"à définir"}`);
 y+=3;T("Consignes",1);T(c.consignes||"Aucune consigne particulière.");y+=6;T(`Fiche émise le ${fdate(new Date())} par ${nm()}`,0,9);d.save(`fiche-${c.ref}.pdf`)}
function mailI(){const c=curI,e=c.entreprise_id?"e":"a",ent=ents.find(x=>x.id===c.entreprise_id),dv=e==="e"&&devisMail,ce=(corps.find(x=>x.id===c.corps_etat_id)||{}).nom;
 const to=e==="e"?(ent?ent.email:c.prestataire_email)||"":agents.filter(a=>(c.agent_ids||[]).includes(a.id)).map(a=>a.email).join(",");
 const m=mdl(e==="a"?"regie":dv?"devis":"entreprise"),v={ref:c.ref,titre:c.titre,consignes:c.consignes,site:siteN(c.site_id),SITE:siteN(c.site_id).toUpperCase(),zone:tribN(c.tribune_id),local:c.local,corps_etat:ce,priorite:PR[c.priorite],echeance:c.echeance?fdate(c.echeance):"",duree:c.duree_h?fduree(c.duree_h):"",signataire:nm()};
 const obj=fill(m.objet,v);sb.rpc("intervention_mail",{p_id:c.id,p_dest:to,p_objet:obj}).then(()=>{if($("ih"))loadH()});location.href="mailto:"+to+"?subject="+encodeURIComponent(obj)+"&body="+encodeURIComponent(fill(m.corps,v))}
$("ibody").onclick=async e=>{const b=e.target.closest("[data-edit],[data-et],[data-create],[data-pdf],[data-mail],[data-nadd],[data-another]");if(!b)return;const d=b.dataset;
 if("edit" in d){ed=!ed;drawI()}else if(d.et)setEt(d.et);else if("create" in d)createI();else if("another" in d){const t=tk.find(x=>x.id===curI.ticket_id);pendingTicket=t;openIv(null,t)}else if("pdf" in d)pdfI();else if("mail" in d)mailI();
 else if("nadd" in d){const m=$("inm").value.trim();if(!m)return;const {error}=await sb.from("intervention_notes").insert({intervention_id:curI.id,auteur:nm(),message:m});if(error)alert(errMsg(error));else{$("inm").value="";loadN()}}};
// ===== ANNUAIRE (console admin) =====
function fillCorpsAnn(){const ks=[...document.querySelectorAll("#en_k [data-ec]:checked")].map(b=>+b.dataset.ec),cur=$("en_c").value,seen=new Set();
 const l=corps.filter(x=>ks.includes(x.categorie_id)&&!seen.has(x.nom)&&seen.add(x.nom));
 $("en_c").innerHTML=`<option value="">Corps d'état (facultatif)</option>`+O(l.map(x=>[x.id,x.nom]),cur)}
function renderAnn(){
 $("en_k").innerHTML=`<b style="font-size:13px">Apparaît dans les catégories :</b> `+cats.map(c=>`<label class="ck" style="display:inline-flex;margin-right:14px"><input type="checkbox" data-ec="${c.id}" checked> ${esc(c.nom)}</label>`).join("");
 fillCorpsAnn();$("en_l").innerHTML=`<div class="table"><table><thead><tr><th>Entreprise</th><th>Catégories</th><th>Corps d'état</th><th>Chargé d'affaires</th><th>E-mail</th><th>Mobile</th><th></th></tr></thead><tbody>${ents.map(e=>`<tr><td>${esc(e.entreprise)}</td><td>${esc((e.categorie_ids||[]).map(i=>(cats.find(c=>c.id===i)||{}).nom).filter(Boolean).join(", ")||"Toutes")}</td><td>${esc((corps.find(x=>x.id===e.corps_etat_id)||{}).nom||"—")}</td><td>${esc(e.contact||"")}</td><td>${esc(e.email||"")}</td><td class="nw">${esc(fmtTel(e.mobile))}</td><td class="nw"><a class="lnk" data-ee="${e.id}">modifier</a> · <a class="lnk" data-en="${e.id}">supprimer</a></td></tr>`).join("")||`<tr><td colspan="7" class="empty">Annuaire vide.</td></tr>`}</tbody></table></div>`}
$("en_t").oninput=()=>{$("en_t").value=fmtTel($("en_t").value)};$("en_k").onchange=fillCorpsAnn;
let enEd=null;
const enReset=()=>{enEd=null;["en_e","en_n","en_m","en_t"].forEach(i=>$(i).value="");$("en_b").textContent="Ajouter";$("en_x").classList.add("hide");document.querySelectorAll("#en_k [data-ec]").forEach(b=>b.checked=true);fillCorpsAnn();$("en_c").value=""};
$("en_b").onclick=()=>{if(!$("en_e").value.trim())return;const ks=[...document.querySelectorAll("#en_k [data-ec]:checked")].map(b=>+b.dataset.ec);if(!ks.length){alert("Cochez au moins une catégorie.");return}
 const o={corps_etat_id:$("en_c").value||null,categorie_ids:ks,entreprise:$("en_e").value.trim(),contact:$("en_n").value.trim()||null,email:$("en_m").value.trim()||null,mobile:fmtTel($("en_t").value)||null};
 const q=enEd?sb.from("entreprises").update(o).eq("id",enEd):sb.from("entreprises").insert(o);enReset();adm(q)};
$("en_x").onclick=enReset;
$("en_l").onclick=e=>{const a=e.target.closest("[data-en],[data-ee]");if(!a)return;
 if(a.dataset.en){if(confirm("Supprimer cette entreprise de l'annuaire ?"))adm(sb.from("entreprises").delete().eq("id",a.dataset.en));return}
 const x=ents.find(v=>v.id==a.dataset.ee);if(!x)return;enEd=x.id;
 document.querySelectorAll("#en_k [data-ec]").forEach(b=>b.checked=!(x.categorie_ids||[]).length||x.categorie_ids.includes(+b.dataset.ec));fillCorpsAnn();
 $("en_c").value=x.corps_etat_id||"";$("en_e").value=x.entreprise;$("en_n").value=x.contact||"";$("en_m").value=x.email||"";$("en_t").value=fmtTel(x.mobile);
 $("en_b").textContent="Enregistrer les modifications";$("en_x").classList.remove("hide");$("en_e").scrollIntoView({block:"center"})};
const NOTICE={demandeur:"notice_demandeur.html",responsable:"notice_responsable.html",supervision:"notice_supervision.html",agent_travaux:"notice_agent.html",agent_exploitation:"notice_agent.html",admin:"notice_administrateur.html"};
$("hlp").onclick=()=>window.open(NOTICE[role()]||"notice_demandeur.html","_blank");
$("sug").onclick=()=>{$("sugt").value="Idée";$("sugti").value="";$("sugtx").value="";$("sugm").textContent="";$("sugb").classList.remove("hide");const adm=me.role==="admin";$("sgtabs").classList.toggle("hide",!adm);sgTab(adm&&SGN>0?"l":"n");$("dS").showModal()};
let SGN=0;
function setSgn(n){SGN=n;const b=$("sug"),t=n>0?`${n} problème${n>1?"s":""} signalé${n>1?"s":""} non traité${n>1?"s":""} – Idées et suggestions`:"Proposer une idée ou une amélioration";b.classList.toggle("alert",n>0);b.title=t;b.setAttribute("aria-label",t);$("sgn").textContent=n>0?`(${n} à traiter)`:""}
function sgTab(k){$("sg_new").classList.toggle("hide",k!=="n");$("sg_list").classList.toggle("hide",k!=="l");$("sgt_n").classList.toggle("on",k==="n");$("sgt_l").classList.toggle("on",k==="l");if(k==="l")renderSug()}
$("sgtabs").onclick=e=>{const b=e.target.closest("[data-sgt]");if(b)sgTab(b.dataset.sgt)};
async function sugAlert(){if(!me||me.role!=="admin")return;const {count,error}=await sb.from("suggestions").select("id",{count:"exact",head:true}).eq("type","Problème rencontré").eq("traitee",false);if(!error)setSgn(count||0)}
$("sugb").onclick=async()=>{const ti=$("sugti").value.trim();$("sugm").style.color="";if(!ti){$("sugm").textContent="Le titre est obligatoire.";return}
 const {error}=await sb.from("suggestions").insert({auteur_nom:nm(),role:me.role,type:$("sugt").value,titre:ti,texte:$("sugtx").value.trim()||null});
 if(error){$("sugm").textContent="Envoi impossible : "+errMsg(error);return}
 $("sugm").style.color="var(--ok)";$("sugm").textContent="Merci, votre suggestion a été transmise à l'administrateur.";$("sugb").classList.add("hide")};
let SG=[];
async function renderSug(){const {data}=await sb.from("suggestions").select("*").order("created_at",{ascending:false});SG=data||[];setSgn(SG.filter(x=>x.type==="Problème rencontré"&&!x.traitee).length);
 $("sug_l").innerHTML=SG.map(x=>`<div class="suivi">${x.type==="Problème rencontré"&&!x.traitee?'<span class="tag t-np">À traiter</span> ':""}<b>${esc(x.type)}</b> – ${esc(x.titre)} <label class="ck" style="display:inline-flex;margin:0 4px"><input type="checkbox" data-sv="${x.id}"${x.traitee?" checked":""} aria-label="Marquer comme traitée"> Traitée</label><button class="sec ic" data-se="${x.id}" title="Modifier" aria-label="Modifier">✎</button> <button class="sec ic" data-sd="${x.id}" title="Supprimer" aria-label="Supprimer">✕</button> <small>(${esc(x.auteur_nom||"")} · ${esc(ROLES[x.role]||"")} · ${tlTime(x.created_at)})</small>${x.texte?`<br>${esc(x.texte)}`:""}</div>`).join("")||`<p class="empty" style="padding:8px">Aucune suggestion.</p>`}
let SE=null;
function editSug(id){const x=SG.find(s=>String(s.id)===String(id));if(!x)return;SE=x.id;$("se_t").value=x.type;$("se_ti").value=x.titre||"";$("se_tx").value=x.texte||"";$("se_m").textContent="";$("dSE").showModal()}
$("se_ok").onclick=async()=>{if(!$("se_ti").value.trim()){$("se_m").textContent="Le titre est obligatoire.";return}
 const {error}=await sb.from("suggestions").update({type:$("se_t").value,titre:$("se_ti").value.trim(),texte:$("se_tx").value.trim()||null}).eq("id",SE);if(error){$("se_m").textContent=errMsg(error);return}$("dSE").close();renderSug()};
$("sug_l").onclick=async e=>{const b=e.target.closest("[data-se],[data-sd]");if(!b)return;if(b.dataset.sd){if(!confirm("Supprimer cette suggestion ?"))return;await sb.from("suggestions").delete().eq("id",b.dataset.sd);renderSug()}else editSug(b.dataset.se)};
$("sug_l").onchange=async e=>{const c=e.target;if(c.dataset.sv===undefined)return;await sb.from("suggestions").update({traitee:c.checked}).eq("id",c.dataset.sv);renderSug()};
$("irows2").onclick=$("irows").onclick;
// ===== Fenêtres : fermeture au clic à côté =====
document.querySelectorAll("dialog").forEach(d=>{if(d.id==="dPw")return;d.addEventListener("click",e=>{if(e.target!==d||d.id==="dNew"||d.id==="dS"||d.id==="dPl"||(d.id==="dIv"&&curI&&!curI.id))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()})});

const catOpts=()=>cats.map(c=>`<option value="${c.id}">${esc(c.nom)}</option>`).join("");
const corpsOpts=cid=>`<option value="">— Choisir un corps d'état —</option>`+corps.filter(x=>x.actif!==false&&x.categorie_id==cid).map(x=>`<option value="${x.id}">${esc(x.nom)}</option>`).join("");
$("ncat").onchange=()=>$("ncorps").innerHTML=corpsOpts($("ncat").value);
start();
(function(){var b=document.getElementById("boot");if(b)b.remove()})();
