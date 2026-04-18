import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import GuestQuickCreateDialog from '../../components/GuestQuickCreateDialog.vue'

vi.mock('../../api/guests', () => ({
  create: vi.fn(),
}))
import * as guestsApi from '../../api/guests'

describe('GuestQuickCreateDialog', () => {
  beforeEach(() => {
    guestsApi.create.mockReset()
  })

  it('renders dialog when modelValue=true', () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    expect(wrapper.find('[data-stub="v-dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Новый гость')
  })

  it('does not emit created when API returns error; keeps dialog open', async () => {
    guestsApi.create.mockRejectedValue({ response: { data: { error: 'Email invalid' } } })
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    wrapper.vm.form.first_name = 'Ivan'
    wrapper.vm.form.last_name = 'Petrov'
    await wrapper.vm.handleSubmit()
    await nextTick()
    expect(wrapper.emitted('created')).toBeFalsy()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.vm.formError).toBe('Email invalid')
  })

  it('emits created(guest) and закрывает dialog при success', async () => {
    const guest = { id: 42, first_name: 'Ivan', last_name: 'Petrov', email: '', phone: '' }
    guestsApi.create.mockResolvedValue(guest)
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    wrapper.vm.form.first_name = 'Ivan'
    wrapper.vm.form.last_name = 'Petrov'
    await wrapper.vm.handleSubmit()
    await nextTick()
    expect(wrapper.emitted('created')).toEqual([[guest]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('validates first_name and last_name required', async () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    // first_name empty, last_name empty
    await wrapper.vm.handleSubmit()
    expect(guestsApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.formError).toBeTruthy()
  })

  it('resets form when modelValue transitions false → true', async () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: false },
    })
    wrapper.vm.form.first_name = 'old'
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    expect(wrapper.vm.form.first_name).toBe('')
    expect(wrapper.vm.form.last_name).toBe('')
    expect(wrapper.vm.formError).toBeNull()
  })
})
