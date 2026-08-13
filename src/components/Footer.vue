<template>
  <div class="container"> 
  <div class="row"> 
    <div class="col text-start"> 
      <p class="copyright">© 2025 Xavier Pedrals. All rights reserved.</p> 
    </div> 
    <div class="col text-end"> 
      <ul class="list-inline footer-links"> 
        <li class="list-inline-item footer-link"> 
          <router-link to="/privacy">Privacy Policy</router-link>
        </li>
        <li class="list-inline-item footer-link"> 
          <router-link to="/terms">Terms of Service</router-link>
        </li>
      </ul> 
    </div> 
  </div>
</div>
</template> 

<style>
.copyright {
  font-size: 0.9em;
  color: #64748b;
}
.footer-link {
  font-size: 0.9em;
}
</style>

<script>
export default {
  name: 'FooterComponent',
};
</script>