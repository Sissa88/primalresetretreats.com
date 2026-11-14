// Shared pricing arithmetic. The booking API loads trusted configuration and recalculates every order.
export function calculateQuote(config,roomID,enteredCode=''){
 const room=config.rooms.find(room=>room.id===roomID);
 if(!room)throw new Error('Unknown accommodation');
 const base=Math.round(Number(room.price)*100);
 const depositPercent=Number(config.deposit_percent),promoPercent=Number(config.promo_percent);
 if(!Number.isSafeInteger(base)||base<0||!Number.isFinite(depositPercent)||depositPercent<=0||depositPercent>100||!Number.isFinite(promoPercent)||promoPercent<0||promoPercent>100)throw new Error('Invalid pricing configuration');
 const code=String(enteredCode).trim().toUpperCase();
 const validPromo=!!config.promo_enabled&&!!code&&code===String(config.promo_code).trim().toUpperCase();
 const discount=validPromo?Math.round(base*promoPercent/100):0;
 const total=base-discount;
 const deposit=Math.round(total*depositPercent/100);
 return {roomID:room.id,roomName:room.name,base,discount,total,deposit,balance:total-deposit,promoApplied:validPromo,code:validPromo?code:''};
}
export const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
