(async()=>{
 try{
  const response=await fetch('/admin/config.json');if(!response.ok)throw Error('Editor configuration is unavailable.');
  const config=await response.json();
  config.backend.base_url=window.location.origin;
  config.site_url=window.location.origin;
  config.display_url=window.location.origin;
  if(!window.CMS)throw Error('The editor could not load. Check your internet connection and refresh.');
  document.querySelector('#loading').remove();
  window.CMS.init({config});
 }catch(error){document.querySelector('#loading').textContent=error.message;}
})();
