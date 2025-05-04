<div className="invoice-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: '5%' }}>S. No.</th>
                <th style={{ width: '30%' }}>Particulars</th>
                <th style={{ width: '10%' }}>Length (in cm)</th>
                <th style={{ width: '10%' }}>Width (in cm)</th>
                <th style={{ width: '15%' }}>Total (in cm²)</th>
                <th style={{ width: '10%' }}>Rate (in cm²)</th>
                <th style={{ width: '20%' }}>Amount Rs.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center-align">1</td>
                <td>Publication Charges</td>
                <td className="center-align">45.00</td>
                <td className="center-align">16.00</td>
                <td className="center-align">720.00</td>
                <td className="center-align">20.00</td>
                <td className="amount-column">14400.00</td>
              </tr>
              <tr>
                <td className="center-align">2</td>
                <td>Colour Charges (40%)</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">0.00</td>
              </tr>
              <tr>
                <td className="center-align">3</td>
                <td>Total</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">14400.00</td>
              </tr>
              <tr>
                <td className="center-align">4</td>
                <td>Less Discount (15%)</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">-2160.00</td>
              </tr>
              <tr>
                <td className="center-align">5</td>
                <td>Total</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">12240.00</td>
              </tr>
              <tr>
                <td className="center-align">6</td>
                <td>Add: CGST</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">306.00</td>
              </tr>
              <tr>
                <td className="center-align">7</td>
                <td>SGST</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">306.00</td>
              </tr>
              <tr>
                <td className="center-align">8</td>
                <td>IGST</td>
                <td className="center-align" colSpan="4"></td>
                <td className="amount-column">-</td>
              </tr>
              <tr className="table-total">
                <td colSpan="6" className="bold-text">Grand Total</td>
                <td className="amount-column">12852.00</td>
              </tr>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="6">
                  <strong>Grand Total</strong>
                </td>
            </tbody>
          </table>
        </div>