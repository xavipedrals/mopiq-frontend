<template>
  <ProfileSettings :profile="profile" />
</template>

<script>
import ProfileSettings from './ProfileSettings.vue';

export default {
  name: 'SettingsPreview',
  components: { ProfileSettings },
  data() {
    return {
      profile: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        isPremium: false,
        answerFeedbackPosition: 'top',
      },
    };
  },
};
</script>
