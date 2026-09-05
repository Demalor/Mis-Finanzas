import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Field, TextInput, SelectInput } from './FormControls'
import { CURRENCIES } from '../types/models'
import type { Account, AccountType, Currency } from '../types/models'

export function AccountFormModal({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean
  account?: Account
  onClose: () => void
  onSave: (data: Omit<Account, 'id'>) => void
}) {
  const [nombre, setNombre] = useState(account?.nombre ?? '')
  const [moneda, setMoneda] = useState<Currency>(account?.moneda ?? 'COP')
  const [tipo, setTipo] = useState<AccountType>(account?.tipo ?? 'efectivo')
  const [cupo, setCupo] = useState(account?.cupo ?? 0)
  const [fechaCorte, setFechaCorte] = useState(account?.fechaCorte ?? 1)
  const [fechaPago, setFechaPago] = useState(account?.fechaPago ?? 15)
  const [diasAviso, setDiasAviso] = useState(account?.diasAvisoPago ?? 5)

  return (
    <Modal open={open} onClose={onClose} title={account ? 'Editar cuenta' : 'Nueva cuenta'}>
      <Field label="Nombre">
        <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Efectivo EUR, Cuenta Nequi" autoFocus />
      </Field>
      <Field label="Moneda">
        <SelectInput value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Tipo de cuenta">
        <SelectInput value={tipo} onChange={(e) => setTipo(e.target.value as AccountType)}>
          <option value="efectivo">💵 Efectivo</option>
          <option value="banco">🏦 Cuenta bancaria</option>
          <option value="tarjeta_credito">💳 Tarjeta de crédito</option>
        </SelectInput>
      </Field>

      {tipo === 'tarjeta_credito' && (
        <>
          <Field label="Cupo (límite de crédito)">
            <TextInput type="number" min={0} value={cupo} onChange={(e) => setCupo(Number(e.target.value))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de corte">
              <TextInput type="number" min={1} max={31} value={fechaCorte} onChange={(e) => setFechaCorte(Number(e.target.value))} />
            </Field>
            <Field label="Día de pago">
              <TextInput type="number" min={1} max={31} value={fechaPago} onChange={(e) => setFechaPago(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Avisar con cuántos días de anticipación" hint="Antes de la fecha de pago">
            <TextInput type="number" min={0} max={30} value={diasAviso} onChange={(e) => setDiasAviso(Number(e.target.value))} />
          </Field>
        </>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!nombre.trim()}
        onClick={() =>
          onSave({
            nombre: nombre.trim(),
            moneda,
            tipo,
            activa: true,
            ...(tipo === 'tarjeta_credito' ? { cupo, fechaCorte, fechaPago, diasAvisoPago: diasAviso } : {}),
          })
        }
      >
        Guardar cuenta
      </Button>
    </Modal>
  )
}
