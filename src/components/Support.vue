<template>
  <div class="container general-container">
    <div class="text-container">
      <router-link to="/">
        <img src = "/logo-small.svg" class="homeLogo" alt="My Happy SVG"/>
      </router-link>
      <h1 class="textTitle">Support</h1>
      <p class="bodyText">If you have any doubt, suggestion or would like to report a bug please feel free to send us a mail to:</p>
      <p class="bodyText" style="color:#0A7AFF;">support@ankiflashcards.app</p>
    </div>
    <hr>
    <FooterComponent/>
  </div>
</template>

<style>
.general-container {
  background: #ffffff;
  box-shadow: 0 6px 20px 0 #CBD5E1;
}
.text-container {
  padding: 24px;
}
.homeLogo {
  margin-top: 30px;
}
.textTitle {
  margin-top: 45px;
  margin-bottom: 35px;
  font-weight: 600;
}
.textSection {
  font-size: 1.3em;
  font-weight: 600;
  margin-top: 40px;
}
.bodyText {
  text-align: justify;
}
@media (max-width: 576px) {
  .text-container {
    padding: 12px;
  }
}
</style>

<script>
import FooterComponent from './Footer.vue';

export default {
  name: 'SupportPage',
  components: {
    FooterComponent
  }
};
</script>
