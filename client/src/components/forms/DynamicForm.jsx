import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Select, Textarea, Button } from '../ui'
import { Upload, CheckCircle2, Loader2 } from 'lucide-react'

// One renderer for every registration/onboarding form in the product -
// TEXT/EMAIL/PHONE/NUMBER/DATE/SELECT/MULTI_SELECT/RADIO/CHECKBOX/TEXTAREA/
// FILE/IMAGE/MULTI_FILE/URL/ADDRESS all go through this same component,
// driven entirely by the field schema the backend serves. Adding a field to
// a form should be a form-config change, not a new page.
const REQUIRED_MARK = <span className='text-red-500 ml-0.5'>*</span>

function FileField({ field, value, onUpload, uploading, error }) {
    const [localName, setLocalName] = useState(value?.originalName || null)
    return (
        <div className='w-full'>
            <label className='block text-[13px] font-medium text-ink mb-1.5'>
                {field.label}{field.required && REQUIRED_MARK}
            </label>
            <label className='flex items-center gap-3 border border-dashed border-line rounded-xl px-4 py-3 cursor-pointer hover:border-accent/50 transition-colors'>
                {uploading ? <Loader2 size={16} className='animate-spin text-accent shrink-0' />
                    : localName ? <CheckCircle2 size={16} className='text-green-600 shrink-0' />
                        : <Upload size={16} className='text-text-secondary shrink-0' />}
                <span className='text-[13.5px] text-text-secondary truncate'>
                    {localName || `Choose a file${field.accept ? ` (${field.accept})` : ''}`}
                </span>
                <input
                    type='file'
                    accept={field.accept || undefined}
                    className='hidden'
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setLocalName(file.name)
                        onUpload(field.key, file)
                    }}
                />
            </label>
            {error && <p className='text-[12px] text-red-500 mt-1.5'>{error}</p>}
        </div>
    )
}

function DynamicForm({ schema, defaultValues = {}, onSubmit, onFileUpload, uploadingField, files = {}, submitLabel = 'Continue', extraFooter = null, submitting = false, onValuesChange, onSectionChange }) {
    const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm({
        mode: 'onChange',
        defaultValues,
    })
    const [activeSection, setActiveSection] = React.useState(0)

    useEffect(() => {
        if (!onValuesChange) return
        const subscription = watch((values) => onValuesChange(values))
        return () => subscription.unsubscribe()
    }, [watch, onValuesChange])

    useEffect(() => {
        if (onSectionChange) onSectionChange(activeSection)
    }, [activeSection, onSectionChange])

    const registerRules = (field) => {
        const rules = { required: field.required ? `${field.label} is required.` : false }
        if (field.type === 'EMAIL') rules.pattern = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' }
        if (field.validation?.minLength) rules.minLength = { value: field.validation.minLength, message: `${field.label} is too short.` }
        if (field.validation?.maxLength) rules.maxLength = { value: field.validation.maxLength, message: `${field.label} is too long.` }
        if (field.validation?.pattern) rules.pattern = { value: new RegExp(field.validation.pattern), message: `${field.label} format is invalid.` }
        return rules
    }

    const renderField = (field) => {
        const error = errors[field.key]?.message
        const commonProps = {
            id: field.key,
            label: <>{field.label}{field.required && REQUIRED_MARK}</>,
            placeholder: field.placeholder || undefined,
            hint: field.helpText || undefined,
            error,
        }

        switch (field.type) {
            case 'TEXTAREA':
                return (
                    <div className='space-y-2'>
                        <Textarea key={field.key} {...commonProps} {...register(field.key, registerRules(field))} className='min-h-[120px]' />
                    </div>
                )
            case 'SELECT':
                return (
                    <Select key={field.key} {...commonProps} {...register(field.key, registerRules(field))}>
                        <option value=''>Select an option...</option>
                        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                )
            case 'MULTI_SELECT':
                return (
                    <Select key={field.key} multiple {...commonProps} {...register(field.key, registerRules(field))} className='h-auto'>
                        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                )
            case 'RADIO':
                return (
                    <div key={field.key} className='w-full space-y-3'>
                        <p className='text-[13px] font-semibold text-ink'>{field.label}{field.required && REQUIRED_MARK}</p>
                        <div className='space-y-2.5'>
                            {field.options.map((o) => (
                                <label key={o.value} className='flex items-center gap-3 text-[14px] text-ink cursor-pointer group'>
                                    <div className='w-5 h-5 rounded-full border-2 border-line group-hover:border-accent/60 transition-colors flex items-center justify-center'>
                                        <input type='radio' value={o.value} {...register(field.key, registerRules(field))} className='opacity-0 absolute cursor-pointer' />
                                        {/* Visual radio indicator */}
                                        <div className='w-2 h-2 rounded-full bg-accent scale-0 group-has-[:checked] scale-100 transition-transform' />
                                    </div>
                                    {o.label}
                                </label>
                            ))}
                        </div>
                        {error && <p className='text-[12px] text-red-500 mt-2'>{error}</p>}
                    </div>
                )
            case 'CHECKBOX':
                return (
                    <label key={field.key} className='flex items-center gap-3 text-[14px] text-ink cursor-pointer group'>
                        <div className='w-5 h-5 rounded-lg border-2 border-line group-hover:border-accent/60 transition-colors flex items-center justify-center bg-white'>
                            <input type='checkbox' {...register(field.key, registerRules(field))} className='opacity-0 absolute cursor-pointer' />
                            <CheckCircle2 size={16} className='text-accent scale-0 group-has-[:checked]:scale-100 transition-transform' />
                        </div>
                        {field.label}{field.required && REQUIRED_MARK}
                    </label>
                )
            case 'NUMBER':
                return <Input key={field.key} type='number' {...commonProps} {...register(field.key, { ...registerRules(field), valueAsNumber: true })} />
            case 'DATE':
                return <Input key={field.key} type='date' {...commonProps} {...register(field.key, registerRules(field))} />
            case 'EMAIL':
                return <Input key={field.key} type='email' {...commonProps} {...register(field.key, registerRules(field))} />
            case 'PHONE':
                return <Input key={field.key} type='tel' {...commonProps} {...register(field.key, registerRules(field))} />
            case 'URL':
                return <Input key={field.key} type='url' {...commonProps} {...register(field.key, registerRules(field))} />
            case 'ADDRESS':
                return <Textarea key={field.key} {...commonProps} placeholder='Street, city, state, postal code' {...register(field.key, registerRules(field))} className='min-h-[100px]' />
            case 'FILE':
            case 'IMAGE':
            case 'MULTI_FILE':
                if (!onFileUpload) return null
                return (
                    <FileField
                        key={field.key}
                        field={field}
                        value={files[field.key]}
                        uploading={uploadingField === field.key}
                        onUpload={onFileUpload}
                        error={field.required && !files[field.key] ? undefined : undefined}
                    />
                )
            default:
                return <Input key={field.key} type='text' {...commonProps} {...register(field.key, registerRules(field))} />
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-10'>
            {schema.sections.map((section, sectionIdx) => (
                <div key={section.key} className='space-y-6'>
                    <div className='border-b border-line pb-4'>
                        <h3 className='font-display text-[20px] font-bold text-ink mb-1'>{section.title}</h3>
                        {section.description && (
                            <p className='text-[14px] text-text-secondary'>{section.description}</p>
                        )}
                    </div>
                    <div className='grid sm:grid-cols-2 gap-6'>
                        {section.fields.map((field) => (
                            <div key={field.key} className={['TEXTAREA', 'ADDRESS', 'RADIO', 'MULTI_SELECT', 'CHECKBOX'].includes(field.type) ? 'sm:col-span-2' : ''}>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {extraFooter}
            <div className='flex items-center justify-between gap-4 pt-4'>
                <div></div>
                <Button type='submit' size='lg' disabled={!isValid || submitting} className=''>
                    {submitting ? (
                        <span className='flex items-center gap-2'>
                            <Loader2 size={16} className='animate-spin' />
                            {submitLabel}...
                        </span>
                    ) : submitLabel}
                </Button>
            </div>
        </form>
    )
}

export default DynamicForm
