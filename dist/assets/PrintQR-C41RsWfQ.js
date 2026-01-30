import{r as S,j as e}from"./index-CSak_wTG.js";import{P as z,a as q,Q as A}from"./index-CI54RkEL.js";import{d as g}from"./helpers-BFGMH2X3.js";import"./createLucideIcon-6Q1StMY_.js";import{b as D,u as Q}from"./index-jxamHYc2.js";import{A as u}from"./arrow-left-DAszoeIp.js";import{D as T}from"./download-uEPl0G0B.js";import{F as L}from"./file-text--9lyR9Wh.js";const $=()=>{const b=D(),p=Q(),r=b.state?.patients||[],j=S.useRef(null),f=()=>{const a=document.createElement("canvas"),s=a.getContext("2d"),d=5,n=120,i=15,y=35,l=n+i*2,m=n+y+i*2,k=Math.ceil(r.length/d);a.width=d*l,a.height=k*m,s.fillStyle="#ffffff",s.fillRect(0,0,a.width,a.height);const N=r.map((t,x)=>new Promise(w=>{const R=x%d,C=Math.floor(x/d),o=R*l+i,c=C*m+i,h=document.getElementById(`qr-canvas-${t.id}`);h&&s.drawImage(h,o+10,c,n,n),s.strokeStyle="#cbd5e1",s.setLineDash([4,4]),s.lineWidth=1,s.strokeRect(o,c-5,l-i,m-i+5),s.setLineDash([]),s.fillStyle="#1e293b",s.font="bold 11px Arial, sans-serif",s.textAlign="center",s.fillText(t.no_rm,o+l/2-i/2,c+n+15),s.fillStyle="#64748b",s.font="9px Arial, sans-serif";const P=t.nama.length>18?t.nama.substring(0,18)+"...":t.nama;s.fillText(P,o+l/2-i/2,c+n+28),w()}));Promise.all(N).then(()=>{setTimeout(()=>{const t=document.createElement("a");t.download=`label-qr-${new Date().toISOString().split("T")[0]}.png`,t.href=a.toDataURL("image/png",1),document.body.appendChild(t),t.click(),document.body.removeChild(t)},100)})},v=()=>{window.print()};return r.length===0?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"page-header no-print",children:e.jsx("h1",{className:"page-title",children:"Print QR Code"})}),e.jsx("div",{className:"page-content",children:e.jsx("div",{className:"card",children:e.jsx("div",{className:"card-body",children:e.jsxs("div",{className:"empty-state",children:[e.jsx("p",{children:"Tidak ada pasien yang dipilih"}),e.jsxs("button",{className:"btn btn-primary mt-md",onClick:()=>p("/admin/patients"),children:[e.jsx(u,{size:18}),"Kembali ke Daftar Pasien"]})]})})})})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"page-header no-print",children:e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"page-title",children:"Print QR Code"}),e.jsxs("p",{className:"page-subtitle",children:[r.length," label QR dipilih"]})]}),e.jsxs("div",{className:"flex gap-sm",children:[e.jsxs("button",{className:"btn btn-secondary",onClick:()=>p("/admin/patients"),children:[e.jsx(u,{size:18}),"Kembali"]}),e.jsxs("button",{className:"btn btn-success",onClick:f,children:[e.jsx(T,{size:18}),"Download Gambar"]}),e.jsxs("button",{className:"btn btn-primary",onClick:v,children:[e.jsx(z,{size:18}),"Preview Print"]})]})]})}),e.jsxs("div",{className:"page-content",children:[e.jsx("div",{className:"card no-print mb-md",children:e.jsxs("div",{className:"card-body",children:[e.jsxs("div",{className:"flex items-center gap-md",children:[e.jsx(L,{size:24,style:{color:"var(--primary-500)"}}),e.jsxs("div",{children:[e.jsx("h3",{style:{fontSize:"1rem",fontWeight:600},children:"Label QR Code untuk Berkas"}),e.jsx("p",{className:"text-sm text-secondary",children:"Ukuran kecil untuk ditempel pada berkas rekam medis"})]})]}),e.jsxs("div",{className:"mt-md",style:{padding:"12px",background:"var(--gray-100)",borderRadius:"var(--radius-md)"},children:[e.jsxs("p",{className:"text-sm",children:[e.jsx("strong",{children:"Download Gambar:"})," Simpan sebagai file PNG untuk dicetak nanti"]}),e.jsxs("p",{className:"text-sm mt-xs",children:[e.jsx("strong",{children:"Preview Print:"})," Buka dialog print browser untuk langsung cetak"]})]})]})}),e.jsxs("div",{className:"print-area",ref:j,children:[e.jsx("style",{children:`
              @media print {
                @page {
                  size: A4;
                  margin: 8mm;
                }
                
                body {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
                
                .print-area {
                  display: block !important;
                }
                
                .print-qr-grid {
                  display: grid !important;
                  grid-template-columns: repeat(5, 1fr) !important;
                  gap: 4mm !important;
                  padding: 0 !important;
                }
                
                .print-qr-item {
                  page-break-inside: avoid;
                  border: 1px dashed #999 !important;
                  padding: 2mm !important;
                }
                
                .no-print {
                  display: none !important;
                }

                .page-header, .card.no-print {
                  display: none !important;
                }
              }
            `}),e.jsx("div",{className:"print-qr-grid",style:{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:"10px",padding:"16px",background:"white",borderRadius:"var(--radius-lg)"},children:r.map(a=>e.jsxs("div",{className:"print-qr-item",style:{textAlign:"center",padding:"10px",border:"1px dashed #e2e8f0",borderRadius:"4px",background:"white"},children:[e.jsx("div",{style:{position:"absolute",left:"-9999px",top:"-9999px"},children:e.jsx(q,{id:`qr-canvas-${a.id}`,value:g(a.no_rm),size:100,level:"H"})}),e.jsx(A,{value:g(a.no_rm),size:80,level:"H",style:{margin:"0 auto"}}),e.jsx("div",{style:{marginTop:"6px",fontWeight:600,fontSize:"10px",lineHeight:1.2,color:"#1e293b"},children:a.no_rm}),e.jsx("div",{style:{fontSize:"8px",color:"#64748b",marginTop:"2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"},children:a.nama})]},a.id))})]})]})]})};export{$ as default};
