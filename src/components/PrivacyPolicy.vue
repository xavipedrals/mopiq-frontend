<template>
  <div class="container general-container">
    <div class="text-container">
      <router-link to="/">
        <img src = "/logo-small.svg" class="homeLogo" alt="My Happy SVG"/>
      </router-link>
      <h1 class="textTitle">{{ $t('common.privacy') }}</h1>
      <p class="bodyText">Xavier Pedrals takes the privacy of our customers and users seriously. We recognize that privacy is an important issue, so we design and operate our services with the protection of your privacy in mind. This Privacy Policy explains what kind of information we collect, use, and the security of your information in relation to our mobile services. By using our services, you consent to this privacy policy.</p>
      
      <p class="bodyText textSection">How we protect your information</p>
      <p class="bodyText">Our primary purpose is to provide you with a safe, smooth, efficient, and customized experience. We may collect non-personal identification information about you, including information in the following categories:</p>
      
      <p class="bodyText">Collect None of Your Personal Information We do not collect any Personal Information through the Keyboard app. Personal Information includes your name, physical address, social numbers, email address and geographic location information.</p>
      <p class="bodyText">Non-Personal Information Collected We collect Non-Personal Information. "Non-Personal Information" is information that does not identify you or any other individual, and includes Session and Usage Data, Log Data and Aggregate Information.</p>
      <p class="bodyText textSection">Data and usage</p>
      <p class="bodyText">Generally we may use Non-Personal information and message data for internal purposes only, such as to provide you with our services, to notify you of new products or services, an ad for promotion and marketing purposes. We do not combine Non-Personal Information with Personal Information. We do not disclose your information to third parties for the third parties' direct marketing purposes, unless you first affirmatively agree to that disclosure.</p>
      
      <p class="bodyText textSection">Information security</p>
      <p class="bodyText">Xavier Pedrals is very concerned about safeguarding the confidentiality of your information. We do not collect Personal Information, and we employ administrative, physical and electronic measures designed to protect your Non-Personal Information from unauthorized access and use. Please be aware that no security measures that we take to protect your information is absolutely guaranteed to avoid unauthorized access or use of your Non-Personal Information or is impenetrable.</p>

      <p class="bodyText textSection">Compliance with laws and law enforcement</p>
      <p class="bodyText">We cooperate with government and law enforcement officials to enforce and comply with the law. We may therefore disclose Session, Usage Data, Message Data, and any other information about you, if we have a good faith belief that it is reasonably necessary to (1) satisfy any applicable law, regulation, legal process or enforceable governmental request, (2) enforce our Terms of Use, including investigation of potential violations thereof, (3) detect, prevent, or otherwise address fraud, security or technical issues, or (4) protect against harm to the rights, property or safety of Xavier Pedrals, its users or the public as required or permitted by law.</p>

      <p class="bodyText textSection">Children’s privacy</p>
      <p class="bodyText">Xavier Pedrals does not knowingly collect Personal Information from children under the age of 13. If you are under 13, please do not attempt to register or send any information about yourself to us, including your name, address, telephone number, or email address. By using our Site or Services, you promise that you are at least 13 years old. If we become aware that we have inadvertently received Personal Information from a child under the age of 13, we will delete such information from our records. If you believe that we might have any information from or about a child under 13, please contact us at support@ankiflashcards.app. In addition, we recommend that minors 13 years of age or older ask their parents for permission before sending any information about themselves to anyone over the Internet.</p>
      
      <p class="bodyText textSection">Changes to our privacy policy</p>
      <p class="bodyText">This Privacy Policy may change from time to time. If we decide to change this private policy, we will provide you additional forms of notice of modifications or updates as appropriate under the circumstances. Your continued use of our Services or any Xavier Pedrals products following the posting of changes will mean you accept those changes.</p>

      <p class="bodyText textSection">Contact us</p>
      <p class="bodyText">If you have any questions or concerns regarding privacy using our services, please send a detailed message to: support@ankiflashcards.app. We will make every effort to resolve your concerns.</p>
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
  name: 'PrivacyPolicy',
  components: {
    FooterComponent
  }
};
</script>
