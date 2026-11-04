Component({
  properties: {
    text: { type: String, value: '' },
    subtext: { type: String, value: '' },
    theme: { type: String, value: 'primary' },
    disabled: { type: Boolean, value: false }
  },
  methods: {
    onTap() {
      if (this.data.disabled) return;
      this.triggerEvent('tap');
    }
  }
});